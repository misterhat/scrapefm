var tap = require('tap').test,

    scrapefm = require('../');

tap('searching', function (test) {
    test.plan(3);

    scrapefm.search('ty seg', function (err, results) {
        var i, result, populated;

        test.notOk(err, 'no errors');
        test.ok(results.length, 'search results found');

        populated = true;

        for (i = 0; i < results.length; i += 1) {
            result = results[i];

            if (!result.type && !result[result.type]) {
                populated = false;
                break;
            }
        }

        test.ok(populated, 'populated results');
    });
});

tap('wrong search', function (test) {
    test.plan(3);

    scrapefm.search('~!@#$%%$', function (err, results) {
        test.notOk(err, 'no errors');
        test.ok(Array.isArray(results), 'results is array');
        test.notOk(results.length, 'no results for invalid search');
    });
});
