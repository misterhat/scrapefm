var cheerio = require('cheerio'),
    needle = require('needle');

var SEARCH_TYPES = {
        6: 'artist',
        8: 'album',
        9: 'track',
        32: 'tag'
    };

function findNumber(mystery) {
    try {
        return +(mystery.match(/\d+/g).join('')) || undefined;
    } catch (e) {}
}

function findImage(css) {
    try {
        return css.match(/url\(\'?(.+?)\'\)/)[1];
    } catch (e) {}
}

function findSeconds(duration) {
    var matches = duration.match(/(\d+):(\d+)/),
        minutes, seconds;

    try {
        minutes = +matches[1] || 0;
        seconds = +matches[2] || 0;

        return (minutes * 60) + seconds;
    } catch (e) {}
}

function findDate(body) {
    var date;

    try {
        date = new Date(body.match(/\d\d \w{3} \d{4}/)[0]);

        if (!/invalid/i.test(date)) {
            return date;
        }
    } catch (e) {}
}

function findFirst(terms, type, operation, options, done) {
    search(terms, options, function (err, results) {
        var i, result;

        if (err) {
            return done(err);
        }

        for (i = 0; i < results.length; i += 1) {
            result = results[i];

            if (result.type === type) {
                return operation(result, options, done);
            }
        }

        done();
    });
}

function makeWrap(operation) {
    return function (terms, options, done) {
        if (!done) {
            done = options;
            options = {};
        }

        options.host = options.host || 'http://www.last.fm';

        options.needle = options.needle || {};
        options.needle.follow = true;

        operation(terms, options, done);
    };
}

function search(terms, options, done) {
    var url = options.host + '/search/autocomplete';

    needle.request('get', url, {
        q: terms,
    }, options.needle, function (err, res, body) {
        var results;

        if (err) {
            return done(err);
        }

        try {
            results = body.response.docs;
        } catch (e) {
            return done(null, []);
        }

        results = results.filter(function (result) {
            return !!SEARCH_TYPES[result.restype];
        }).map(function (result) {
            var cleaned = {
                type: SEARCH_TYPES[result.restype]
            };

            if (cleaned.type === 'tag') {
                cleaned.tag = result.tag;
                return cleaned;
            } else if (cleaned.type === 'track') {
                cleaned.track = result.track;
                cleaned.duration = result.duration;
            } else if (cleaned.type === 'album') {
                cleaned.album = result.album;
            }

            cleaned.artist = result.artist;

            return cleaned;
        });

        done(null, results);
    });
}

function findArtist(terms, options, done) {
    var url = options.host + '/music/' + terms;

    needle.get(url, options.needle, function (err, res, body) {
        var $, artist;

        if (err) {
            return done(err);
        }

        if (/^40/.test(res.statusCode)) {
            return done();
        }

        try {
            $ = cheerio.load(body);
        } catch (e) {
            return done(e);
        }

        artist = {
            albums: [],
            artist: $('h1[itemprop="name"]').first().text().trim(),
            description: $('.wiki-text').first().text().trim(),
            listeners: findNumber($('.listeners').first().text()),
            scrobbles: findNumber($('.scrobbles').first().text()),
            similar: [],
            tags: [],
            tracks: []
        };

        $('.tags').first().children().each(function () {
            artist.tags.push($(this).text().trim());
        });

        $('table.chart tr').each(function () {
            artist.tracks.push({
                track: $('.subjectCell', this).text().trim(),
                listeners: findNumber($('.chartbarCell', this).text())
            });
        });

        $('.album-list-item').children().each(function () {
            artist.albums.push({
                album: $('.text-over-image-text', this).first().text(),
                art: $('.cover-image-image', this).attr('src'),
                listeners: findNumber(
                    $('.text-over-image-text--secondary', this).text()
                ),
                released: new Date($('time', this).attr('datetime')),
                tracks: +$('[itemprop=numTracks]', this).text() || undefined
            });
        });

        $('.similar-artist').each(function () {
            artist.similar.push({
                art: findImage($('.cover-image', this).attr('style')),
                artist: $(this).text().trim()
            });
        });

        done(null, artist);
    });
}

function findAlbum(terms, options, done) {
    var url;

    if (typeof terms === 'string') {
        return findFirst(terms, 'album', findAlbum, options, done);
    }

    url = options.host + '/music/' + terms.artist + '/' + terms.album

    needle.get(url, options.needle, function (err, res, body) {
        var $, album;

        if (err) {
            return done(err);
        }

        if (/^40/.test(res.statusCode)) {
            return done();
        }

        try {
            $ = cheerio.load(body);
        } catch (e) {
            return done(e);
        }

        album = {
            album: $('h1[itemprop="name"]').first().text().trim(),
            art: $('.album-cover').attr('src'),
            artist: $('.top-crumb').first().text().trim(),
            description: $('.wiki-text').first().text().trim(),
            label: $('a[href^="/label"]').first().text().trim(),
            listeners: findNumber($('.listeners').first().text()),
            released: findDate(body),
            scrobbles: findNumber($('.scrobbles').first().text()),
            tags: [],
            tracks: []
        };

        $('.tags').first().children().each(function () {
            album.tags.push($(this).text().trim());
        });

        $('#albumTracklist tr').each(function () {
            album.tracks.push({
                duration: findSeconds($('.durationCell', this).text()),
                listeners: findNumber($('.reachCell', this).text()),
                track: $('.subjectCell', this).text().trim()
            });
        });

        done(null, album);
    });
}

function findTrack(terms, options, done) {
    var url;

    if (typeof terms === 'string') {
        return findFirst(terms, 'track', findTrack, options, done);
    }

    url = options.host + '/music/' + terms.artist + '/_/' + terms.track;

    needle.get(url, options.needle, function (err, res, body) {
        var $, track;

        if (err) {
            return done(err);
        }

        if (/^40/.test(res.statusCode)) {
            return done();
        }

        try {
            $ = cheerio.load(body);
        } catch (e) {
            return done(e);
        }

        track = {
            album: $('.media-link-reference').first().text().trim(),
            art: $('.featured-album').first().attr('src'),
            artist: $('.top-crumb').first().text().trim(),
            description: $('.wiki-text').first().text().trim(),
            duration: findSeconds($('h1 .lite').first().text()),
            listeners: findNumber($('.listeners').first().text()),
            scrobbles: findNumber($('.scrobbles').first().text()),
            similar: [],
            tags: [],
            track: $('[itemprop="name"]').first().text().trim()
        };

        $('.tags').first().children().each(function () {
            track.tags.push($(this).text().trim());
        });

        $('.similar-tracks tbody tr').each(function () {
            track.similar.push({
                artist: $('.subjectCell a', this).first().text().trim(),
                track: $('.subjectCell a', this).eq(1).text().trim(),
                duration: findSeconds($('.durationCell', this).text()),
                listeners: findNumber($('.reachCell', this).text())
            });
        });

        done(null, track);
    });
}

module.exports.search = makeWrap(search);
module.exports.artist = makeWrap(findArtist);
module.exports.album = makeWrap(findAlbum);
module.exports.track = makeWrap(findTrack);
