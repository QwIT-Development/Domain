const sharp = require('sharp');
const { Readable } = require('stream');

const svgToPng = async (svgCode) => {
    // get resolution from code via the best thing, regex!!1!
    const viewBoxRegex = /width="([^"]+)" ?height="([^"]+)"/mi;
    const viewBoxMatch = svgCode.match(viewBoxRegex);

    let width = 500;
    let height = 500;
    if (viewBoxMatch) {
        width = parseInt(viewBoxMatch[1], 10);
        height = parseInt(viewBoxMatch[2], 10);
    }

    // if the code above fails (90% esely), then fallback to default 500x500
    if (isNaN(width)) width = 500;
    if (isNaN(height)) height = 500;

    const pngBuffer = await sharp(Buffer.from(svgCode))
        .resize(width, height)
        .png()
        .toBuffer();

    return pngBuffer;
};

module.exports = { svgToPng };
