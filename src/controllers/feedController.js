'use strict';

/**
 * The controller that exposes information about releases
 * @module
 */

var fs = require('fs'),
    path = require('path'),
    ejs = require('ejs'),
    helpers = require('../util/helpers');

/**
 * @param {object} releases - The object represented in the releases.json file
 * @param {object} options - The command line options used to start mountebank
 */
function create (releases, options) {

    // Init once since we hope many consumers poll the heroku feed and we don't have monitoring
    var feedReleases = helpers.clone(releases);
    feedReleases.reverse();

    function releaseViewFor (version) {
        return 'releases/' + version + '.ejs';
    }

    function releaseFilenameFor (version) {
        return path.join(__dirname, '/../views/', releaseViewFor(version));
    }

    /**
     * The function that responds to GET /feed
     * @memberOf module:controllers/feedController#
     * @param request {object} The HTTP request
     * @param response {object} The HTTP response
     */
    function getFeed (request, response) {
        var page = parseInt(request.query.page || '1'),
            nextPage = page + 1,
            entriesPerPage = 10,
            hasNextPage = feedReleases.slice((nextPage * entriesPerPage) - 10, entriesPerPage * nextPage).length > 0,
            config = {
                host: request.headers.host,
                releases: feedReleases.slice(page * entriesPerPage - 10, entriesPerPage * page),
                hasNextPage: hasNextPage,
                nextLink: '/feed?page=' + nextPage
            };

        // I'd prefer putting this as an include in the view, but EJS doesn't support dynamic includes
        if (!feedReleases[0].view) {
            feedReleases.forEach(function (release) {
                var contents = fs.readFileSync(releaseFilenameFor(release.version), { encoding: 'utf8' });
                release.view = ejs.render(contents, {
                    host: request.headers.host,
                    releaseMajorMinor: release.version.replace(/^v(\d+\.\d+).*/, '$1'),
                    releaseVersion: release.version.replace('v', '')
                });
            });
        }

        response.type('application/atom+xml');
        response.render('feed', config);
    }

    /**
     * The function that responds to GET /releases
     * @memberOf module:controllers/feedController#
     * @param request {object} The HTTP request
     * @param response {object} The HTTP response
     */
    function getReleases (request, response) {
        response.render('releases', { releases: feedReleases });
    }

    /**
     * The function that responds to GET /releases/:version
     * @memberOf module:controllers/feedController#
     * @param request {object} The HTTP request
     * @param response {object} The HTTP response
     */
    function getRelease (request, response) {
        var version = request.params.version,
            config = {
                host: request.headers.host,
                heroku: options.heroku,
                releaseMajorMinor: version.replace(/^v(\d+\.\d+).*/, '$1'),
                releaseVersion: version.replace('v', '')
            };

        if (fs.existsSync(releaseFilenameFor(version))) {
            response.render('_header', config, function (headerError, header) {
                if (headerError) { throw headerError; }
                response.render(releaseViewFor(version), config, function (bodyError, body) {
                    if (bodyError) { throw bodyError; }
                    response.render('_footer', config, function (footerError, footer) {
                        if (footerError) { throw footerError; }
                        response.send(header + body + footer);
                    });
                });
            });
        }
        else {
            response.status(404).send('No such release');
        }
    }

    return {
        getFeed: getFeed,
        getReleases: getReleases,
        getRelease: getRelease
    };
}

module.exports = {
    create: create
};
