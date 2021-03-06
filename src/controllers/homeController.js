'use strict';

/**
 * The controller that returns the base mountebank hypermedia
 * @module
 */

var date = require('../util/date');

/**
 * Creates the home controller
 * @param releases
 * @returns {{get: get}}
 */
function create (releases) {

    function createNotice (release) {
        return {
            version: release.version,
            when: date.howLongAgo(release.date)
        };
    }

    function isRecent (notice) {
        return notice.when !== '';
    }

    /**
     * The function that responds to GET /
     * @memberOf module:controllers/homeController#
     * @param {Object} request - the HTTP request
     * @param {Object} response - the HTTP response
     */
    function get (request, response) {
        var hypermedia = {
                _links: {
                    imposters: { href: '/imposters' },
                    config: { href: '/config' },
                    logs: { href: '/logs' }
                }
            },
            notices = releases.map(createNotice).filter(isRecent),
            viewNotices = [];

        if (notices.length > 0) {
            notices.reverse();
            viewNotices.push(notices[0]);
        }

        response.format({
            json: function () { response.send(hypermedia); },
            html: function () { response.render('index', { notices: viewNotices }); }
        });
    }

    return {
        get: get
    };

}

module.exports = {
    create: create
};
