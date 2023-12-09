"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = require("axios");
var cheerio = require('cheerio');
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var dateArg = process.argv[2];
var fs = require("fs");
var xml2js = require("xml2js");
var reallysimple = require('reallysimple');
var mm = require("music-metadata-browser");
var he = require('he');
// Define the URL you want to scrape
var url = dateArg
    ? "https://www.newyorker.com/magazine/".concat(dateArg)
    : 'https://www.newyorker.com/magazine/';
// Create an Observable from the axios promise
var http$ = (0, rxjs_1.from)(axios_1.default.get(url));
http$
    .pipe(
// Extract the HTML string from the axios response
(0, operators_1.map)(function (response) { return response.data; }), 
// Parse the HTML string with cheerio
// @ts-ignore
(0, operators_1.map)(function (html) { return cheerio.load(html); }), 
// Extract the data you're interested in
(0, operators_1.map)(function ($) {
    var articles = [];
    // For each article
    $('ul[class^="River__list"] > li').each(function (index, element) {
        // Scrape the title, description, and byline
        var title = $(element).find('h4').text();
        var description = $(element).find('h5').text();
        var byline = $(element).find('p[class^="Byline__by"]').text();
        // Extract the date from the url and rearrange parts
        var dateParts = url.split('/').slice(-3);
        var date = dateParts[0].slice(-2) + dateParts[1] + dateParts[2];
        // Extract the last name from the byline
        var lastName = byline.split(' ').pop().toLowerCase();
        // Construct the audioUrl
        var audioUrl = "https://downloads.newyorker.com/mp3/".concat(date, "fa_fact_").concat(lastName, "_apple.mp3");
        // Format the date
        var pubDate = new Date(dateArg);
        var options = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short',
        };
        var formattedDate = pubDate.toLocaleDateString('en-US', options);
        // Add the article to the list
        articles.push({
            title: title,
            description: description,
            byline: byline,
            audioUrl: audioUrl,
            pubDate: formattedDate,
        });
    });
    return articles;
}), (0, operators_1.switchMap)(function (articles) {
    // Create an array of Observables, one for each article
    var requests = articles.map(function (article) {
        return new Promise(function (resolve) {
            // Send a GET request to the audioUrl
            axios_1.default
                .get(article.audioUrl)
                .then(function (response) {
                // If the response contains the error message, the link is not working
                if (response.data.includes('This XML file does not appear to have any style information associated with it.')) {
                    article.audioWorking = false;
                }
                else {
                    article.audioWorking = true;
                }
                resolve(article);
            })
                .catch(function (error) {
                // If there's an error, the link is not working
                article.audioWorking = false;
                resolve(article);
            });
        });
    });
    // Return a new Observable that emits the articles once all requests have completed
    return (0, rxjs_1.forkJoin)(requests);
}), 
// Flatten the Observable
(0, operators_1.switchMap)(function (articles) { return articles; }), (0, operators_1.filter)(function (article) { var _a; return (_a = article.audioWorking) !== null && _a !== void 0 ? _a : false; }), (0, operators_1.toArray)())
    .subscribe(function (articles) { return __awaiter(void 0, void 0, void 0, function () {
    var currentFeed;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, readFeed()];
            case 1:
                currentFeed = _a.sent();
                updateFeed(currentFeed, articles);
                return [2 /*return*/];
        }
    });
}); }, function (error) { return console.error(error); });
function readFeed() {
    return __awaiter(this, void 0, void 0, function () {
        var urlFeed;
        return __generator(this, function (_a) {
            urlFeed = 'https://johnfewell.github.io/scrape/feed.xml';
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    reallysimple.readFeed(urlFeed, function (err, theFeed) {
                        if (err) {
                            console.log(err.message);
                            reject(err);
                        }
                        else {
                            console.log(JSON.stringify(theFeed, undefined, 4));
                            resolve(theFeed);
                        }
                    });
                })];
        });
    });
}
function updateFeed(feed, articles) {
    return __awaiter(this, void 0, void 0, function () {
        var oldItems, newItems, allItems, itunesFeedItems, newFeed, builder, xml;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    oldItems = feed === null || feed === void 0 ? void 0 : feed.items.map(function (article) {
                        return {
                            title: he.encode(article.title),
                            'itunes:summary': he.encode(article.description),
                            enclosure: {
                                $: {
                                    url: article.enclosure.url,
                                    type: 'audio/mpeg',
                                    length: article.enclosure.length,
                                },
                            },
                            'itunes:author': article.author,
                            'itunes:duration': article.length,
                            'itunes:subtitle': 'foo',
                            guid: article.guid,
                            pubDate: article.pubDate,
                        };
                    });
                    return [4 /*yield*/, Promise.all(articles.map(function (article) { return __awaiter(_this, void 0, void 0, function () {
                            var duration, metadata, err_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        duration = 0;
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, mm.fetchFromUrl(article.audioUrl)];
                                    case 2:
                                        metadata = _a.sent();
                                        duration = metadata.format.duration || 123454;
                                        console.warn({ duration: duration });
                                        return [3 /*break*/, 4];
                                    case 3:
                                        err_1 = _a.sent();
                                        console.error(err_1);
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/, {
                                            title: he.encode(article.title),
                                            'itunes:summary': he.encode(article.description),
                                            enclosure: {
                                                $: {
                                                    url: article.audioUrl,
                                                    type: 'audio/mpeg',
                                                    length: duration,
                                                },
                                            },
                                            'itunes:author': he.encode(article.byline),
                                            'itunes:duration': duration,
                                            'itunes:subtitle': 'foo',
                                            guid: Date.now().toString(),
                                            pubDate: article.pubDate,
                                        }];
                                }
                            });
                        }); }))];
                case 1:
                    newItems = _a.sent();
                    console.log('feed', feed);
                    allItems = __spreadArray(__spreadArray([], oldItems, true), newItems, true);
                    console.log('items', allItems);
                    itunesFeedItems = {
                        'itunes:image': {
                            $: {
                                href: 'https://johnfewell.github.io/scrape/pirate-radio-hi.jpg',
                            },
                        },
                        'itunes:subtitle': 'For fun',
                        'itunes:author': 'Smol bean',
                        'itunes:summary': 'This 4 friends',
                        'itunes:owner': {
                            'itunes:name': 'smallest',
                            'itunes:email': 'facts@f4te.com',
                        },
                        'itunes:category': {
                            $: {
                                text: 'Kids &amp; Family',
                            },
                        },
                        'itunes:explicit': 'false',
                    };
                    delete feed.items;
                    newFeed = {
                        rss: {
                            $: {
                                version: '2.0',
                                'xmlns:itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd',
                                'xmlns:content': 'http://purl.org/rss/1.0/modules/content/',
                            },
                            channel: __assign(__assign(__assign({}, feed), itunesFeedItems), { item: __spreadArray([], allItems, true) }),
                        },
                    };
                    builder = new xml2js.Builder({
                        headless: false,
                        renderOpts: {
                            pretty: true,
                            indent: ' ',
                            newline: '\n',
                        },
                    });
                    xml = builder.buildObject(newFeed);
                    console.log('new feed', xml);
                    // Write the updated XML back to the file
                    fs.writeFile('feed.xml', xml, function (err) {
                        if (err) {
                            console.error('Error writing to file:', err);
                        }
                        else {
                            console.log('Successfully wrote to file');
                        }
                    });
                    return [2 /*return*/];
            }
        });
    });
}
