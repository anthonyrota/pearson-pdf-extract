const pdfkit = require("pdfkit");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const pLimit = require("p-limit");

var PDFMatrix = function () {
  this.a = 1;
  this.b = 0;
  this.c = 0;
  this.d = 1;
  this.e = 0;
  this.f = 0;
  this.Set = function (a, b, c, d, e, f) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
  };
  this.Reset = function () {
    this.a = this.d = 1;
    this.b = this.c = this.e = this.f = 0;
  };
  this.SetReverse = function (a) {
    var b = a.a * a.d - a.b * a.c;
    if (0 != b) {
      var c = -b;
      this.a = a.d / b;
      this.b = a.b / c;
      this.c = a.c / c;
      this.d = a.a / b;
      this.e = (a.c * a.f - a.d * a.e) / b;
      this.f = (a.a * a.f - a.b * a.e) / c;
    }
  };
  this.Rotate = function (a, b) {
    var c = Math.cos(a),
      d = Math.sin(a),
      e = new WebPDF.PDFMatrix();
    e.Set(c, d, -d, c, 0, 0);
    var f = null;
    f = b
      ? WebPDF.PDFMatrix.Concat2mt(e, this)
      : WebPDF.PDFMatrix.Concat2mt(this, e);
    this.Set(f.a, f.b, f.c, f.d, f.e, f.f);
  };
  this.RotateAt = function (a, b, c, d) {
    this.Translate(a, b, d), this.Rotate(c, d), this.Translate(-a, -b, d);
  };
  this.Concat = function (a, b, c, d, e, f, g) {
    var h = new WebPDF.PDFMatrix();
    h.Set(a, b, c, d, e, f);
    var i = null;
    i = bPrePended
      ? WebPDF.PDFMatrix.Concat2mt(h, this)
      : WebPDF.PDFMatrix.Concat2mt(this, h);
    this.Set(i.a, i.b, i.c, i.d, i.e, i.f);
  };
  this.Is90Rotated = function () {
    var a = 1e3 * this.a;
    0 > a && (a *= -1);
    var b = 1e3 * this.d;
    0 > b && (b *= -1);
    var c = this.b;
    0 > c && (c *= -1);
    var d = this.c;
    return 0 > d && (d *= -1), c > a && d > b;
  };
  this.IsScaled = function () {
    var a = 1e3 * this.b;
    0 > a && (a *= -1);
    var b = 1e3 * this.c;
    0 > b && (b *= -1);
    var c = this.a;
    0 > c && (c *= -1);
    var d = this.d;
    return 0 > d && (d *= -1), c > a && d > b;
  };
  this.GetA = function () {
    return this.a;
  };
  this.GetB = function () {
    return this.b;
  };
  this.GetC = function () {
    return this.c;
  };
  this.GetD = function () {
    return this.d;
  };
  this.GetE = function () {
    return this.e;
  };
  this.GetF = function () {
    return this.f;
  };
  this.Translate = function (a, b, c) {
    c
      ? ((thi.e += a * this.a + b * this.c),
        (this.f += b * this.d + a * this.b))
      : ((this.e += a), (this.f += b));
  };
  this.Scale = function (a, b, c) {
    this.a *= a;
    this.d *= b;
    c
      ? ((this.b *= a), (this.c *= b))
      : ((this.b *= b), (this.c *= a), (this.e *= a), (this.f *= b));
  };
  this.TransformXDistance = function (a) {
    var b = this.a * a,
      c = this.b * a;
    return Math.sqrt(b * b + c * c);
  };
  this.TransformYDistance = function (a) {
    var b = this.c * a,
      c = this.d * a;
    return Math.sqrt(b * b + c * c);
  };
  this.TransformDistance = function (a, b) {
    var c = this.a * a + this.c * b,
      d = this.b * a + this.d * b;
    return Math.sqrt(c * c + d * d);
  };
  this.TransFormPoint = function (a, b) {
    var c = this.a * a + this.c * b + this.e,
      d = this.b * a + this.d * b + this.f,
      e = [];
    return (
      (e[0] = parseFloat(c.toFixed(3))), (e[1] = parseFloat(d.toFixed(3))), e
    );
  };
  this.TransFormRect = function (a, b, c, d) {
    var e = function (a, b, c, d) {
      var e = [],
        f = [];
      e[0] = a;
      f[0] = c;
      e[1] = a;
      f[1] = d;
      e[2] = b;
      f[2] = c;
      e[3] = b;
      f[3] = d;
      for (var g, h = 0; 4 > h; h++)
        (g = this.TransFormPoint(e[h], f[h])), (e[h] = g[0]), (f[h] = g[1]);
      g = null;
      var i = [e[0], e[0], f[0], f[0]];
      for (h = 1; 4 > h; h++)
        i[0] > e[h] && (i[0] = e[h]),
          i[1] < e[h] && (i[1] = e[h]),
          i[2] > f[h] && (i[2] = f[h]),
          i[3] < f[h] && (i[3] = f[h]);
      return i;
    };
    (f = e.call(this, a, c, b, d)), (g = []);
    return (
      (g[0] = f[0]),
      (g[1] = f[2]),
      (g[2] = f[1]),
      (g[3] = f[3]),
      (f = null),
      (e = null),
      g
    );
  };
  this.GetXUnit = function () {
    return 0 === b
      ? Math.abs(a)
      : 0 === a
      ? Math.abs(b)
      : Math.sqrt(a * a + b * b);
  };
  this.GetYUnit = function () {
    return 0 === c
      ? Math.abs(d)
      : 0 === d
      ? Math.abs(c)
      : Math.sqrt(c * c + d * d);
  };
  this.GetUnitRect = function () {
    return this.TransFormRect(0, 0, 1, 1);
  };
  this.MatchRect = function (a, b) {
    var c = b[0] - b[2];
    (this.a = Math.abs(c) < 0.001 ? 1 : (a[0] - a[2]) / c),
      (c = b[3] - b[1]),
      (this.d = Math.abs(c) < 0.001 ? 1 : (a[3] - a[1]) / c),
      (this.e = a[0] - b[0] * this.a),
      (this.f = a[3] - b[3] * this.d),
      (this.b = 0),
      (this.c = 0);
  };
};

var fNormalize = function (a) {
  var b;
  a.left > a.right && ((b = a.left), (a.left = a.right), (a.right = b));
  a.bottom > a.top && ((b = a.bottom), (a.bottom = a.top), (a.top = b));
};

async function getTextForPage(pageNumber) {
  const res = await fetch(
    `https://d3es7gri3mq9uc.cloudfront.net/resources/products/epubs/generated/B7560A83-3047-4D3F-A203-B499F3BFAAAE/foxit-assets/annotations/page${pageNumber}?formMode=true&password=`,
    {
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
      },
      referrer: "https://reader-sin-prod.gls.pearson-intl.com/",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: null,
      method: "GET",
      mode: "cors",
    }
  );
  if (!res.ok) {
    throw new Error(`bad response ${response.statusText}`);
  }
  const json = await res.json();
  if (json.error !== 0) {
    throw new Error(`response error ${json.error}`);
  }
  /** @type {{texts:any[]}} */
  var { texts } = JSON.parse(json.TextPageData);
  const textObjectList = texts.map((
    /** @type {{ cs: any[]; }} */ {
      li: lineIndex,
      oi: objIndex,
      ci: charIndex,
      cs,
      mt,
      wm,
    }
  ) => {
    const thing = {
      /** @type {number} */
      lineIndex,
      /** @type {number} */
      objIndex,
      /** @type {number} */
      charIndex,
      characters: cs.map((c) => {
        if (c.length !== 5) {
          throw new Error("invalid cs");
        }
        const [o, p, q, r, x] = c;
        const char = {
          charRect: {
            /** @type {number} */
            left: o,
            /** @type {number} */
            top: p,
            /** @type {number} */
            right: o + q,
            /** @type {number} */
            bottom: p + r,
          },
          /** @type {number} */
          charCode: x,
          /** @type {string} */
          charText: String.fromCharCode(x),
        };
        fNormalize(char.charRect);
        return char;
      }),
      textPageMatrix: new PDFMatrix(),
    };
    if ("undefined" !== typeof mt && null != mt) {
      thing.textPageMatrix.Set(mt[0], mt[1], mt[2], mt[3], mt[4], mt[5]);
    } else {
      thing.textPageMatrix.Set(1, 0, 0, 1, 0, 0);
    }
    if ("undefined" != typeof wm && null != typeof wm) {
      thing.writingMode = wm;
    }
    return thing;
  });
  const t = textObjectList[textObjectList.length - 1];
  let strSize;
  let lineCount;
  if (t) {
    strSize;
  }
  return textObjectList;
}

const pageNames = fs.readdirSync("pages");
pageNames.sort(
  (a, b) =>
    +path.basename(a, path.extname(a)) - +path.basename(b, path.extname(a))
);

const doc = new pdfkit({
  autoFirstPage: false,
});

doc.pipe(
  fs.createWriteStream(
    path.join(
      __dirname,
      "generated",
      "Year_12_HSC_Economics_Australia_in_the_Global_Economy.pdf"
    )
  )
);

var lastPage = require("./shared").lastPage;

(async () => {
  const limit = pLimit(25);
  const textObjectLists = await Promise.all(
    Array.from({ length: lastPage + 1 }, (_, i) =>
      limit(() => {
        console.log("fetching text for page", i);
        return getTextForPage(i);
      })
    )
  );
  const textOpts = {
    lineBreak: false,
  };
  const referenceFontSize = 20;
  doc.fontSize(referenceFontSize);
  const referenceHeight = doc.heightOfString("x", textOpts);
  for (let i = 0; i <= lastPage; i++) {
    const pageName = pageNames[i];
    console.log("creating page", i);
    try {
      const image = doc.openImage(path.join(__dirname, "pages", pageName));
      doc.addPage({
        size: [image.width, image.height],
      });
      doc.image(image, 0, 0);
      doc.fillColor("white", 0);
      const textObjectList = textObjectLists[i];
      for (const textObj of textObjectList) {
        const { textPageMatrix } = textObj;
        for (const char of textObj.characters) {
          const { charRect, charText } = char;
          const { left, top, bottom, right } = charRect;
          doc.fontSize(referenceFontSize);
          const scale = 1.335;
          const charHeight = (top - bottom) * scale;
          const height = doc.heightOfString(charText, textOpts);
          doc.fontSize(
            referenceFontSize *
              (height / referenceHeight) *
              (charHeight / referenceHeight)
          );
          doc.text(
            charText,
            left * scale,
            image.height - top * scale + charHeight / 10,
            textOpts
          );
        }
      }
    } catch (error) {
      console.error("error on page", pageName);
      console.log(error);
      process.exit(1);
    }
  }
  doc.end();
})().catch((error) => {
  console.log("unexpected error...");
  console.log(error);
  process.exit(1);
});
