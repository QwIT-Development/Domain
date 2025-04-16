const sharp = require('sharp');
const { Readable } = require('stream');

const svgToPng = async (svgCode) => {
    // get resolution from code via the best thing, regex!!1!
    const viewBoxRegex = /width="([^"]+)" ?height="([^"]+)"/gmi;
    const viewBoxMatch = svgCode.match(viewBoxRegex);

    let width = 500;
    let height = 500;
    if (viewBoxMatch) {
        width = parseInt(viewBox[1], 10);
        height = parseInt(viewBox[2], 10);
    }

    const pngBuffer = await sharp(Buffer.from(svgCode))
        .resize(width, height)
        .png()
        .toBuffer();

    return pngBuffer;
};

module.exports = { svgToPng };
