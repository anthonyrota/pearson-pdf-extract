const pdfkit = require("pdfkit");
const fs = require("fs");
const path = require("path");

const pageNames = fs.readdirSync("pages");
pageNames.sort(
  (a, b) =>
    +path.basename(a, path.extname(a)) - +path.basename(b, path.extname(a))
);

const doc = new pdfkit({
  autoFirstPage: false,
});

doc.pipe(
  fs.createWriteStream(path.join(__dirname, "generated", "img-only.pdf"))
);

for (let i = 0; i < pageNames.length; i++) {
  const pageName = pageNames[i];
  console.log("writing page", i);
  try {
    const image = doc.openImage(path.join(__dirname, "pages", pageName));
    doc.addPage({
      size: [image.width, image.height],
    });
    doc.image(image, 0, 0);
  } catch (error) {
    console.error("error on page", pageName);
    console.log(error);
    process.exit(-1);
  }
}

doc.end();
