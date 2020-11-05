const util = require("util");
const path = require("path");
const fs = require("fs");
const pipeline = util.promisify(require("stream").pipeline);
const fetch = require("node-fetch");
const pLimit = require("p-limit");

function exitError(error) {
  console.error("unexpected error...");
  console.log(error);
  process.exit(1);
}

const limit = pLimit(5);

for (
  let pageNumber = 0;
  pageNumber <= require("./shared").lastPage;
  pageNumber++
) {
  limit(() =>
    fetch(
      `https://d3es7gri3mq9uc.cloudfront.net/resources/products/epubs/generated/B7560A83-3047-4D3F-A203-B499F3BFAAAE/foxit-assets/pages/page${pageNumber}`
    )
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`bad response ${response.statusText}`);
      }
      console.log("writing", `${pageNumber}.png`);
      return pipeline(
        response.body,
        fs.createWriteStream(path.join(__dirname, "pages", `${pageNumber}.png`))
      );
    })
    .catch(exitError);
}
