var tap = require('tap').test,

    scrapefm = require('../');

tap('track', function (test) {
    test.plan(13);

    scrapefm.track({
        artist: 'the velvet underground',
        track: 'heroin'
    }, function (err, track) {
        test.notOk(err, 'no errors');
        test.ok(track, 'track found');
        test.equals(track.track, 'Heroin', 'valid title');
        test.ok(track.duration > 1, 'valid duration');
        test.ok(/debut/i.test(track.description), 'valid description');
        test.ok(/velvet/i.test(track.artist), 'valid artist');
        test.ok(track.listeners > 1, 'valid listeners');
        test.ok(track.scrobbles > 1, 'valid scrobbles');
        test.ok(/http:/.test(track.art), 'valid art');

        test.ok(track.tags.length, 'found tags');

        test.ok(track.tags.filter(function (tag) {
            return /rock/i.test(tag);
        }).length, 'valid tags');

        test.ok(track.similar.length, 'found similar track');

        test.notOk(track.similar.filter(function (similar) {
            var invalid =
                !similar.artist || !similar.track || !similar.duration ||
                !similar.listeners

            return invalid;
        }).length, 'populated similar tracks');

        tap('implicit track', function (test) {
            test.plan(2);

            scrapefm.track('velvet heroin', function (err, implicit) {
                test.notOk(err, 'no errors');
                test.deepEquals(track, implicit, 'correct implicit track');
            });
        });
    });
});

tap('wrong track', function (test) {
    test.plan(2);

    scrapefm.track('UF*E#&F', function (err, track) {
        test.notOk(err, 'no errors');
        test.notOk(track, 'track is falsey');
    });
});
