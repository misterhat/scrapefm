var scrapefm = require('./');

scrapefm.search('ty segall', function (err, results) {
    if (!err) {
        results.forEach(function (result) {
            console.log(result.type + ': ' + result[result.type]);
        });
    }
});

scrapefm.album('melted ty', function (err, album) {
    if (!err) {
        console.log(album.album + ' by ' + album.artist);

        album.tracks.forEach(function (track, i) {
            i++;
            console.log(i + '. ' + track.track + ' - ' + track.duration + 's');
        });
    }
});
