const callbackify = require('util').callbackify;
const cheerio = require('cheerio');
const got = callbackify(require('got'));
const randomMua = require('random-mua');

const fs = require('fs');

// parse the seconds out of a formatted time (2:30 -> 150)
function findSeconds(duration) {
    const matches = duration.trim().match(/(\d+):(\d+)/);
    let minutes, seconds;

    try {
        minutes = +matches[1] || 0;
        seconds = +matches[2] || 0;

        return (minutes * 60) + seconds;
    } catch (e) {
        return null;
    }
}

class ScrapeFM {
    constructor(host, headers) {
        this.host = host || 'https://www.last.fm';
        this.headers = {};
        this.options = {
            baseUrl: this.host,
            headers: this.headers
        };
        this.headers.dnt = 1;
        this.reloadAgent();
        // save the last URL each request so we can set the referer
        this.lastUrl = this.host;
        Object.keys(header => this.headers[header] = headers[header]);
        // TODO referers
    }

    // set a new user agent
    reloadAgent() {
        this.headers.agent = randomMua();
    }

    parseScrobblesListeners($) {
        let displays = $('.header-metadata-display');
        let scrobbles = displays.first().children().first().attr('title');
        scrobbles = scrobbles.trim().match(/\d/g);
        scrobbles = scrobbles ? +scrobbles.join('') : 0;

        let listeners = displays.eq(1).children().first().attr('title')
        listeners = listeners.trim().match(/\d/g);
        listeners = listeners ? +listeners.join('') : 0;

        return { scrobbles, listeners };
    }

    parseHContent(header) {
        let content = header.parent();
        header.remove();
        content = content.text().trim();
        return content;
    }

    parseDescription($) {
        let desc = $('.wiki p').toArray();
        desc = desc.map(elem => $(elem).text().trim()).join(' ');
        desc = desc.replace('… read more', '');
        return desc;
    }

    // parse a list of tags
    parseTags($) {
        let tags = $('.regular-tags-with-user-tags a').toArray();
        tags = tags.map(elem => $(elem).text());
        return tags;
    }

    // parse a background header image
    parseBackgroundImage($) {
        let background = $('.header-background--has-image').attr('style');
        background = background.trim();
        let bgMatch = background.match(/url\(/);
        if (bgMatch) {
            return background.slice(bgMatch.index + 4, -2);
        }

        return null;
    }

    // parse the tables that contain song tracks on various pages
    parseTrackTable($, e) {
        const results = [];

        $(e).find('tr').slice(1).each(function () {
            let result = {
                name: $(this).find('.link-block-target').text().trim(),
            }

            let artist = $(this).find('.chartlist-artists').text().trim();
            if (artist) {
                result.artist = artist;
            }

            let youtube = $(this).find('.chartlist-play a');
            result.youtube = youtube ? youtube.attr('href') : null;

            let duration = $(this).find('.chartlist-duration').text();
            if (duration) {
                result.duration = findSeconds(duration);
            }

            let listens = $(this).find('.chartlist-countbar').text();
            if (listens) {
                result.listeners = +listens.match(/\d/g).join('');
            }

            results.push(result);
        });

        return results;
    }

    // parse grid items (albums and artists in search results and respective
    // pages)
    parseGrid($, e, isListeners = false) {
        const results = [];

        $(e).find('.grid-items-cover-image').each(function () {
            let result = {
                image: $(this).find('img').attr('src'),
                name: $(this).find('p').eq(0).text().trim(),
            };

            //console.log('test');

            if (isListeners) {
                let aux = $(this).find('.stat-name').parent().text().trim();

                try {
                    aux = +aux.match(/\d/g).join('');
                } catch (e) {
                }

                if (aux) {
                    result.listeners = aux;
                }
            } else {
                let artist = $(this).find('.grid-items-item-aux-text').text();
                artist = artist.trim();

                if (artist) {
                    result.artist = artist;
                }
            }

            results.push(result);
        });

        return results;
    }

    // parse the main search page
    parseSearch(html) {
        const $ = cheerio.load(html);

        let artistSection = $('h2:contains("Artists")').parent();
        let albumSection = $('h2:contains("Albums")').parent();
        let trackSection = $('h2:contains("Tracks")').parent();

        return {
            artists: this.parseGrid($, artistSection, true),
            albums: this.parseGrid($, albumSection, true),
            tracks: this.parseTrackTable($, trackSection)
        };
    }

    // parse a specific artist's page
    parseArtist(html) {
        const $ = cheerio.load(html);
        const artist = {};

        artist.image = this.parseBackgroundImage($);
        artist.artist = $('h1.header-title').text().trim();

        let sl = this.parseScrobblesListeners($);
        artist.scrobbles = sl.scrobbles;
        artist.listeners = sl.listeners;

        artist.tags = this.parseTags($);

        let factbox = $('.factbox-summary').text().trim();
        let factboxMatches =  factbox.match(/(.+) \((.*[^\s–])[\s–]+(.*)\)/);
        if (factboxMatches) {
            artist.originLocation = factboxMatches[1];
            artist.originYear = +factboxMatches[2] || null;
            artist.endYear = +factboxMatches[3] || null;
        }

        artist.description = this.parseDescription($);

        artist.topTracks = this.parseTrackTable($, $('#top-tracks-section'));
        artist.topTracks = artist.topTracks.map(track => ({
            artist: artist.artist,
            listeners: track.listeners,
            name: track.name,
            youtube: track.youtube
        }));

        let topAlbums = $('h2:contains("Top Albums")').parent();
        artist.topAlbums = this.parseGrid($, topAlbums, true);
        artist.topAlbums = artist.topAlbums.map(album => {
            album.artist = artist.artist;
            return album;
        });

        let similarArtists = $('h2:contains("Similar Artists")').parent();
        artist.similarArtists = this.parseGrid($, similarArtists, false);

        return artist;
    }

    // parse a specific album's page
    parseAlbum(html) {
        const $ = cheerio.load(html);
        const album = {};

        album.artistImage = this.parseBackgroundImage($);
        album.image = $('img.cover-art').attr('src');
        album.artistName = $('[itemprop="byArtist"]').text().trim();
        album.name = $('h1.header-title').text().trim();

        let sl = this.parseScrobblesListeners($);
        album.scrobbles = sl.scrobbles;
        album.listeners = sl.listeners;

        let released = this.parseHContent($('h2:contains("Release date")'));
        album.released = new Date(released);

        let length = this.parseHContent($('h2:contains("Running length")'));
        length = length.match(/\d/g);
        length = length ? +length.join('') : 0;
        album.length = length;

        let time = this.parseHContent($('h2:contains("Running time")'));
        album.time = findSeconds(time);

        album.tags = this.parseTags($);
        album.description = this.parseDescription($);

        let tracklist = $('h2:contains("Tracklist")').parent();
        album.tracks = this.parseTrackTable($, tracklist);

        return album;
    }

    parseTrack(html) {
        const $ = cheerio.load(html);
        const track = {};

        track.artistImage = this.parseBackgroundImage($);
        track.artistName = $('[itemprop="byArtist"]').text().trim();
        track.name = $('h1.header-title span').first().text().trim();

        let duration = $('.header-title-duration').text().trim();

        if (duration) {
            duration = duration.slice(1, -1);
            track.duration = findSeconds(duration);
        }

        let sl = this.parseScrobblesListeners($);
        track.scrobbles = sl.scrobbles;
        track.listeners = sl.listeners;

        let fromAlbum = $('h2:contains("From the album")').next().text().trim();
        track.albumName = fromAlbum;

        track.tags = this.parseTags($);
        track.youtube = $('a.image-overlay-playlink-link').attr('href');

        let sTracks = $('h2:contains("Similar Tracks")').next();
        track.similarTracks = this.parseGrid($, sTracks, false);

        return track;
    }

    getAndParseHtml(url, options, parser, done) {
        got(url, options, (err, res) => {
            if (err) {
                return done(err);
            }

            let results;

            try {
                results = parser.bind(this)(res.body);
            } catch (e) {
                return done(e);
            }

            done(null, results);
        });
    }

    // get a specific track with an artist and track name (optionally album)
    getTrack(artist, track, album, done) {
        if (!done) {
            done = album;
            album = '_';
        }

        let url = `/music/${artist}/${album}/${track}`;
        let options = { ...this.options };
        options.headers = { ...this.headers };

        let ref = '/search?q=';
        if (Math.random() >= 0.5) {
            ref += artist + ' ' + track;
        } else {
            ref += track + ' ' + artist;
        }

        options.headers.referer = ref;
        this.getAndParseHtml(url, options, this.parseTrack, done);
    }

    // get a specific album's page by album and artist name
    getAlbum(artist, album, done) {
        let url = `/music/${artist}/${album}`;
        let options = { ...this.options };
        options.headers = { ...this.headers };

        let ref = '/search?q=';
        if (Math.random() >= 0.5) {
            ref += artist + ' ' + album;
        } else {
            ref += album + ' ' + artist;
        }

        options.headers.referer = ref;
        this.getAndParseHtml(url, options, this.parseAlbum, done);
    }

    // get a specific artist's page by name
    getArtist(artist, done) {
        let url = `/music/${artist}`;
        let options = { ...this.options };
        options.headers = { ...this.headers };
        options.headers.referer = `/search?q=${artist}`;
        this.getAndParseHtml(url, options, this.parseArtist, done);
    }

    // search artists, albums and tracks
    searchAll(terms, done) {
        terms = encodeURIComponent(terms);
        let url = `/search?q=${terms}`;
        let options = { ...this.options };
        options.headers = { ...this.headers };
        options.headers.referer = this.host;
        this.getAndParseHtml(url, options, this.parseSearch, done);
    }
}

module.exports = ScrapeFM;
