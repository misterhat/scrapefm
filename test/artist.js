var tap = require('tap').test,

    scrapefm = require('../');

tap('artist', function (test) {
    test.plan(13);

    scrapefm.artist('the velvet underground', function (err, artist) {
        test.notOk(err, 'no errors');
        test.ok(artist, 'artist found');
        test.ok(/^The V/i.test(artist.artist), 'valid artist');
        test.ok(/new york/i.test(artist.description), 'valid description');
        test.ok(artist.listeners, 'valid listeners');
        test.ok(artist.scrobbles, 'valid scrobbles');

        test.ok(artist.tags.filter(function (tag) {
            return /psychedelic/i.test(tag);
        }).length, 'valid tags');

        test.ok(artist.tracks.length, 'found tracks');

        test.notOk(artist.tracks.filter(function (track) {
            return !track.track || !track.listeners;
        }).length, 'populated tracks');

        test.ok(artist.albums.length, 'found albums');

        test.notOk(artist.albums.filter(function (album) {
            var invalid =
                !album.album || !album.listeners || !/http:/.test(album.art) ||
                !album.tracks;

            return invalid;
        }).length, 'populated albums');

        test.ok(artist.similar.length, 'found similar artists');

        test.notOk(artist.similar.filter(function (similar) {
            return !similar.artist || !/http:/.test(similar.art);
        }).length, 'populated similar artists');
    });
});

tap('wrong artist', function (test) {
    test.plan(2);

    scrapefm.artist('&^&(#F8v39', function (err, artist) {
        test.notOk(err, 'no errors');
        test.notOk(artist, 'artist is falsey');
    });
});
