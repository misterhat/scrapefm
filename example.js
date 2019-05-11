const ScrapeFM = require('./');
const scrapefm = new ScrapeFM();

scrapefm.getTrack('the offspring', 'bad habit', (err, res) => {
    if (err) {
        return console.error(err);
    }

    console.log(res);
});
