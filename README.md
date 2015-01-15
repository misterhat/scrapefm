# scrapefm
A lightweight last.fm scraper. Provides access to last.fm's album, artist, track
and search features through a simple, intuitive API. This module *does not*
require an API key.

## Installation
    $ npm install scrapefm

## Examples
```javascript
var scrapefm = require('scrapefm');

scrapefm.search('ty segall', function (err, results) {
    if (!err) {
        results.forEach(function (result) {
            console.log(result.type + ': ' + result[result.type]);
        });
    }
});

// artist: Ty Segall
// artist: Ty Segall Band
// album: Melted
// album: Slaughterhouse
// ...

scrapefm.album('melted ty', function (err, album) {
    if (!err && album) {
        console.log(album.album + ' by ' + album.artist);
        album.tracks.forEach(function (track, i) {
            i++;
            console.log(i + '. ' + track.track + ' - ' + track.duration + 's');
        });
    }
});

// Melted by Ty Segall
// 1. Finger - 173s
// 2. Caesar - 183s
// ...
```

## API
### scrapefm.search(terms, [options], done)
Search last.fm website for an artist, tag, album or track.

`terms` is expected to be a string.

`options` is an optional object with the following properties:

```javascript
{
    host: 'http://www.last.fm', // which base host to use for scraping
    needle: { } // options passed into each needle request
}
```

`done` returns an array of search results (in order of relevance).


### scrapefm.artist(terms, [options], done)
Fetch various information about an artist.

`terms` is a string of the artist's name.

`options` is the same `options` described in `.search`.

`done` returns an object of the following:

```javascript
{
    artist: String,
    description: String,
    listeners: Number,
    scrobbles: Number,
    tags: [ String, ... ],

    // the top <15 tracks
    tracks: [
        {
            track: String,
            listeners: Number
        },
        ...
    ],

    // the top <4 albums
    albums: [
        {
            album: String,
            listeners: Number,
            art: String
            tracks: Number
        },
        ...
    ],

    // the top <6 similar artists
    similar: [
        {
            artist: String,
            art: String
        },
        ...
    ]
}
```

### scrapefm.album(terms, [options], done)
Fetch various information about a specific album.

`terms` can either be a string or an object. If `terms` is a string,it's
searched and the first album found is used. If `terms` is an object, it should
have the `album` and `artist` properties.

`options` is the same `options` described in `.search`.

`done` returns an object of the following:

```javascript
{
    album: String,
    artist: String,
    description: String,
    released: Date,
    label: String,
    listeners: Number,
    scrobbles: Number,
    art: String, // album art URL
    tags: [ String, ... ],
    tracks: [
        {
            track: String,
            duration: Number, // seconds
            listeners: Number
        },
        ...
    ]
}
```

### scrapefm.track(terms, [options], done)
Fetch information about a specific track.

`terms` can either be a string or an object. If `terms` is a string, it's
searched and the first track is used. If `terms` is an object,
it should have `artist` and `track` properties.

`options` is the same `options` described in `.search`.

`done` returns an object of the following:

```javascript
{
    track: String,
    duration: Number,
    description: String,
    artist: String,
    album: String,
    listeners: Number,
    scrobbles: Number,
    art: String, // album art URL
    tags: [ String, ... ],
    similar: [
        {
            artist: String,
            track: String,
            duration: Number,
            listeners: Number
        },
        ...
    ]
}
```

## License
MIT
