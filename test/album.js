var needle = require('needle'),
    tap = require('tap').test,

    scrapefm = require('../');

tap('album', function (test) {
    test.plan(13);

    scrapefm.album({
        album: 'help!',
        artist: 'the beatles'
    }, function (err, album) {
        test.notOk(err, 'no errors');
        test.ok(album, 'album found');
        test.ok(/help/i.test(album.album), 'valid title');
        test.ok(/beatles/i.test(album.artist), 'valid artist');
        test.ok(/ticket to ride/i.test(album.description), 'valid description');
        test.type(album.released.getFullYear(), 'number', 'released is date');
        test.ok(album.label.length, 'label is present');
        test.ok(album.listeners > 1, 'valid listeners');
        test.ok(album.scrobbles > 1, 'valid scrobbles');
        test.ok(/http:/.test(album.art), 'album art is url');

        test.ok(album.tags.filter(function (tag) {
            return /rock/i.test(tag);
        }).length, 'valid tags');

        test.ok(album.tracks.length, 'tracks found');

        test.notOk(album.tracks.filter(function (track) {
            return !track.track.length || !track.duration || !track.listeners;
        }).length, 'populated tracks');

        tap('implicit album', function (test) {
            test.plan(2);

            scrapefm.album('beatles help', function (err, implicit) {
                test.notOk(err, 'no errors');
                test.deepEquals(album, implicit, 'correct implicit album');
            });
        });
    });
});

tap('wrong album', function (test) {
    test.plan(2);

    scrapefm.album({
        artist: '^%G&#*$',
        album: '&^^^'
    }, function (err, album) {
        test.notOk(err, 'no errors');
        test.notOk(album, 'falsey album');
    });
});
