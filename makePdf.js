'use strict';

const fs = require('fs');
const path = require('path');
const progress = require('cli-progress');
const colors = require('colors');
const imageSize = require('image-size');
const fetch = require('node-fetch');
const pLimit = require('p-limit');
const pdfkit = require('pdfkit');

const args = process.argv.slice(2);
const debugTextIndex = args.indexOf('--debug-text');
let debugText = false;
if (debugTextIndex !== -1) {
    debugText = true;
    args.splice(debugTextIndex, 1);
}
const pageCountIndex = args.indexOf('--pages');
let pageCount;
if (pageCountIndex !== -1) {
    pageCount = +args[pageCountIndex + 1];
    if (Number.isNaN(pageCount)) {
        throw new Error(`--pages: Invalid page count ${pageCount}`);
    }
    args.splice(pageCountIndex, 2);
}
const fontFamilyIndex = args.indexOf('--font');
let fontFamily;
if (fontFamilyIndex !== -1) {
    fontFamily = args[fontFamilyIndex + 1];
    if (fontFamily === undefined || fontFamily.startsWith('-')) {
        throw new Error(`--font flag provided with no font family value`);
    }
    args.splice(fontFamilyIndex, 2);
}
const singleCharacterWordPaddingIndex = args.indexOf(
    '--single-character-word-padding',
);
let singleCharacterWordPadding;
if (singleCharacterWordPaddingIndex !== -1) {
    singleCharacterWordPadding = +args[singleCharacterWordPaddingIndex + 1];
    if (Number.isNaN(singleCharacterWordPadding)) {
        throw new Error(
            `--single-character-word-padding: ${singleCharacterWordPadding} is not a number`,
        );
    }
    args.splice(singleCharacterWordPaddingIndex, 2);
}
const imageOnlyIndex = args.indexOf('--image-only');
let imageOnly = false;
if (imageOnlyIndex !== -1) {
    imageOnly = true;
    args.splice(imageOnlyIndex, 1);
    if (fontFamily !== undefined) {
        throw new Error('--font cannot be used with --image-only');
    }
    if (debugText) {
        throw new Error('--font cannot be used with --image-only');
    }
    if (singleCharacterWordPadding !== undefined) {
        throw new Error(
            '--single-character-word-padding cannot be used with --image-only',
        );
    }
}
for (const arg of args) {
    if (arg.startsWith('-')) {
        throw new Error(`Unknown flag ${arg}`);
    }
}
if (args.length !== 2) {
    throw new Error(
        'Expected two arguments: the foxit asset url and the out path',
    );
}
const [foxitAssetUrl, relativeOutPath] = args;

function normalizeRectangle(rectangle) {
    let temp;
    if (rectangle.left > rectangle.right) {
        temp = rectangle.left;
        rectangle.left = rectangle.right;
        rectangle.right = temp;
    }
    if (rectangle.bottom > rectangle.top) {
        temp = rectangle.bottom;
        rectangle.bottom = rectangle.top;
        rectangle.top = temp;
    }
}

async function getTextForPage(pageNumber) {
    const res = await fetch(
        `${foxitAssetUrl}/annotations/page${pageNumber}?formMode=true&password=`,
        { mode: 'cors' },
    );
    if (!res.ok) {
        throw new Error(`bad response ${res.statusText}`);
    }
    const json = await res.json();
    if (json.error !== 0) {
        throw new Error(`response error ${json.error}`);
    }
    const { texts } = JSON.parse(json.TextPageData);
    return texts.map(({ cs }) => ({
        characters: cs.map((c) => {
            if (c.length !== 5) {
                throw new Error('invalid cs');
            }
            const [o, p, q, r, x] = c;
            const char = {
                charRect: {
                    left: o,
                    top: p,
                    right: o + q,
                    bottom: p + r,
                },
                charCode: x,
                charText: String.fromCharCode(x),
            };
            normalizeRectangle(char.charRect);
            return char;
        }),
    }));
}

async function getImageForPage(pageNumber) {
    const res = await fetch(`${foxitAssetUrl}/pages/page${pageNumber}`);
    if (!res.ok) {
        throw new Error(`bad response ${res.statusText}`);
    }
    return res.buffer();
}

async function getManifest() {
    const res = await fetch(`${foxitAssetUrl}/manifest`);
    if (!res.ok) {
        throw new Error(`bad response ${res.statusText}`);
    }
    const json = await res.json();
    if (json.error !== 0) {
        throw new Error(`response error ${json.error}`);
    }
    const docInfo = JSON.parse(json.docinfo);
    return {
        pageCount: pageCount !== undefined ? pageCount : docInfo.PageCount,
        pagesInfo: docInfo.PagesInfo,
    };
}

async function main() {
    const limit = pLimit(25);
    let concurrentP = Promise.resolve();
    const doc = new pdfkit({
        autoFirstPage: false,
    });
    const outPath = path.join(process.cwd(), relativeOutPath);
    doc.pipe(fs.createWriteStream(outPath));
    const textOpts = {
        lineBreak: false,
        baseline: 'middle',
        characterSpacing: 0,
    };
    const referenceFontSize = 20;
    const manifest = await getManifest();
    const bar = new progress.SingleBar({
        format: `|${colors.cyan(
            '{bar}',
        )}| {percentage}% || {value}/{total} pages`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
    });
    bar.start(manifest.pageCount, 0);
    await Promise.all(
        Array.from({ length: manifest.pageCount }, (_, i) =>
            (async () => {
                let resolve;
                const cP = concurrentP;
                concurrentP = concurrentP.then(
                    () =>
                        new Promise((res) => {
                            resolve = res;
                        }),
                );
                const [textObjectList, imageBuffer] = await Promise.all([
                    imageOnly ? undefined : limit(() => getTextForPage(i)),
                    limit(() => getImageForPage(i)),
                ]);
                await cP;
                const imageDimensions = imageSize(imageBuffer);
                doc.addPage({
                    size: [imageDimensions.width, imageDimensions.height],
                });
                doc.image(imageBuffer, 0, 0);
                if (imageOnly) {
                    bar.update(i);
                    resolve();
                    return;
                }
                const xScale =
                    imageDimensions.width / manifest.pagesInfo[i].width;
                const yScale =
                    imageDimensions.height / manifest.pagesInfo[i].height;
                if (debugText) {
                    doc.fillColor('#ddd');
                    doc.fillOpacity(0.7);
                } else {
                    doc.fillOpacity(0);
                }
                doc.font(fontFamily !== undefined ? fontFamily : 'Times-Roman');
                for (const textObj of textObjectList) {
                    let wordStartOffset = 0;
                    for (let i = 0; i < textObj.characters.length; i++) {
                        let j = i;
                        for (; j < textObj.characters.length - 1; j++) {
                            const thisChar = textObj.characters[j + 1];
                            if (/\s/.test(thisChar.charText)) {
                                break;
                            }
                        }
                        let word = '';
                        let firstChar;
                        let lastChar;
                        for (; i <= j; i++) {
                            const char = textObj.characters[i];
                            if (/\s/.test(char.charText)) {
                                continue;
                            }
                            if (!firstChar) {
                                firstChar = char;
                            }
                            lastChar = char;
                            word += char.charText;
                        }
                        if (!firstChar) {
                            continue;
                        }
                        const wordWidth =
                            (lastChar.charRect.right -
                                firstChar.charRect.left) *
                            xScale;
                        const wordHeight =
                            (firstChar.charRect.top -
                                firstChar.charRect.bottom) *
                            yScale;
                        doc.fontSize(referenceFontSize);
                        const referenceHeight = Math.max(
                            doc.heightOfString(firstChar.charText, textOpts),
                            1,
                        );
                        const fontSize =
                            referenceFontSize * (wordHeight / referenceHeight);
                        doc.fontSize(fontSize);
                        const measuredWordWidth = doc.widthOfString(
                            word,
                            textOpts,
                        );
                        const characterSpacing =
                            word.length === 1
                                ? 0
                                : (wordWidth -
                                      wordStartOffset -
                                      measuredWordWidth) /
                                  (word.length - 1);
                        if (debugText) {
                            doc.rect(
                                firstChar.charRect.left * xScale,
                                imageDimensions.height -
                                    firstChar.charRect.top * xScale,
                                wordWidth,
                                wordHeight,
                            ).stroke('#ddd');
                        }
                        doc.text(
                            word,
                            wordStartOffset + firstChar.charRect.left * xScale,
                            imageDimensions.height -
                                firstChar.charRect.top * yScale +
                                wordHeight / 2,
                            { ...textOpts, characterSpacing },
                        );
                        if (singleCharacterWordPadding !== undefined) {
                            if (word.length === 1) {
                                wordStartOffset +=
                                    measuredWordWidth *
                                    singleCharacterWordPadding;
                            } else {
                                wordStartOffset = 0;
                            }
                        }
                    }
                }
                bar.update(i);
                resolve();
            })(),
        ),
    );
    doc.end();
    bar.update(manifest.pageCount);
    bar.stop();
    console.log(
        `Created ${imageOnly ? 'image only ' : ''}PDF ${
            debugText ? 'with text debug ' : ''
        }at`,
        outPath,
    );
}

main().catch((error) => {
    console.log('unexpected error...');
    console.log(error);
    process.exit(1);
});
