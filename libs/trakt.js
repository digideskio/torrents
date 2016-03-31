var Trakt = require('trakt.tv');
var utils = require('./utils');
var db = require('./db').db;

var clientId = '45c2123b81d80846f5fee59c1f0f921a2d6ab9738ae0a28597ac164f2b0a1ad6';
var clientSecret = '6e1da19f42213d8cc1800828a73e0e2d732e39f3ba1f6098165f432b413b6f28';

var trakt = null;
var authenticated = false;

function createTraktInstance () {
    trakt = new Trakt({
        client_id: clientId,
        client_secret: clientSecret,
        plugins: ['ondeck']
    });

    authenticated = false;
}

createTraktInstance();
var savedToken = db('settings').find({name: 'trakt_token'});
if (savedToken) {
    authenticated = true;
    trakt.import_token(savedToken.value);
}

module.exports = {};

module.exports.deck = () =>
    trakt.ondeck
        .getAll()
        .then(r => {
            r.shows.forEach(function (show) {
                show.next_episode.query = 'S' + utils.formatEpisodeNumber(show.next_episode.season) +
                    'E' + utils.formatEpisodeNumber(show.next_episode.number);
            });

            r.shows.sort(function (a, b) {
                return new Date(a.show.updated_at) < new Date(b.show.updated_at);
            });

            return r;
        });

module.exports.markEpisodeWatched = ids =>
    trakt.sync.history.add({
        episodes: [{
            watched_at: new Date(),
            ids: ids
        }]
    });

module.exports.isAuthenticated = () => authenticated;

module.exports.getAuthUrl = () => trakt.get_url();

module.exports.authenticate = code =>
    trakt.exchange_code(code)
        .then(r => {
            authenticated = true;

            db('settings').push({
                name: 'trakt_token',
                value: r
            });

            return null;
        });

module.exports.logout = () => {
    db('settings').remove({name: 'trakt_token'});
    createTraktInstance();
};
