var tap = require('tap').test,

    scrapefm = require('../');

tap('searching', function (test) {
    test.plan(3);

    scrapefm.search('ty seg', function (err, results) {
        test.notOk(err, 'no errors');
        test.ok(results.length, 'search results found');

        test.notOk(results.filter(function (result) {
            return !result.type && !result[result.type];
        }).length, 'populated results');
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
