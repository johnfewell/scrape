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
function getNextMonday() {
    var now = new Date();
    var nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7));
    return nextMonday;
}
function formatDate(date) {
    var year = date.getFullYear().toString().slice(-2); // get last two digits of year
    var month = (date.getMonth() + 1).toString().padStart(2, '0'); // get month and pad with 0 if needed
    var day = date.getDate().toString().padStart(2, '0'); // get date and pad with 0 if needed
    return year + month + day;
}
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
    var articleId = $('meta[name="id"]').attr('content');
    // const articleId = $('meta[name="parsely-post-id"]').attr('content');
    // console.warn('id', articleId);
    // For each article
    $('ul[class^="River__list"] > li').each(function (index, element) {
        // Scrape the title, description, and byline
        var title = $(element).find('h4').text();
        var articleUrl = $(element).find('a:has(h4)').attr('href');
        var description = $(element).find('h5').text();
        var byline = $(element).find('p[class^="Byline__by"]').text();
        var date = '';
        if (!dateArg) {
            date = formatDate(getNextMonday());
        }
        else {
            // Extract the date from the dateArg and rearrange parts
            var dateParts = dateArg.split('/');
            date = dateParts[0].slice(-2) + dateParts[1] + dateParts[2];
        }
        // Extract the last name from the byline
        var lastName = byline.split(' ').pop().toLowerCase();
        // Construct the audioUrl
        var audioUrl = "https://downloads.newyorker.com/mp3/".concat(date, "fa_fact_").concat(lastName, "_apple.mp3");
        // Format the date
        var pubDate = dateArg ? new Date(dateArg) : getNextMonday();
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
            articleId: '0',
            title: title,
            description: description,
            byline: byline,
            articleUrl: 'https://www.newyorker.com' + articleUrl,
            audioUrl: audioUrl,
            audmUrl: '',
            pubDate: formattedDate,
            audioWorking: 'none',
        });
    });
    return articles;
}), (0, operators_1.switchMap)(function (articles) {
    // Create an array of Observables, one for each article
    var requests = articles.map(function (article) {
        return (0, rxjs_1.from)(axios_1.default.get(article.articleUrl)).pipe((0, operators_1.map)(function (response) { return cheerio.load(response.data); }), (0, operators_1.map)(function ($) {
            var articleId = $('meta[name="id"]').attr('content');
            // Add the articleId to the article object
            article.articleId = articleId;
            var audmUrl = "https://static.nytimes.com/narrated-articles/audm-embed/newyorker/".concat(articleId, ".m4a");
            article.audmUrl = audmUrl;
            return article;
        }));
    });
    // Return a new Observable that emits the articles once all requests have completed
    return (0, rxjs_1.forkJoin)(requests);
}), (0, operators_1.switchMap)(function (articles) {
    // console.warn('articles', articles);
    // Create an array of Observables, one for each article
    var requests = articles.map(function (article) {
        return new Promise(function (resolve) {
            // Send a GET request to the audioUrl
            axios_1.default
                .get(article.audioUrl)
                .then(function (response) {
                // If the request is successful, the audioUrl is working
                article.audioWorking = 'audioUrl';
                resolve(article);
            })
                .catch(function (error) {
                // If there's an error, the audioUrl is not working
                // Now check audmUrl
                axios_1.default
                    .get(article.audmUrl)
                    .then(function (response) {
                    // If the request is successful, the audmUrl is working
                    article.audioWorking = 'audmUrl';
                    resolve(article);
                })
                    .catch(function (error) {
                    // If there's an error, neither audioUrl nor audmUrl is working
                    article.audioWorking = 'none';
                    resolve(article);
                });
            });
        });
    });
    // Return a new Observable that emits the articles once all requests have completed
    return (0, rxjs_1.forkJoin)(requests);
}), 
// Flatten the Observable
(0, operators_1.switchMap)(function (articles) { return articles; }), (0, operators_1.filter)(function (article) { return article.audioWorking !== 'none'; }), (0, operators_1.toArray)())
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
                    console.log('articles', articles);
                    oldItems = feed === null || feed === void 0 ? void 0 : feed.items.map(function (article) {
                        console.log('OLD article', article);
                        return {
                            title: article.title,
                            'itunes:summary': article.description,
                            enclosure: {
                                $: {
                                    url: article.enclosure.url,
                                    type: 'audio/mpeg',
                                    length: article.enclosure.length,
                                },
                            },
                            'itunes:author': article.author,
                            'itunes:duration': article.enclosure.length,
                            'itunes:subtitle': 'foo',
                            guid: article.guid,
                            pubDate: article.pubDate,
                        };
                    });
                    return [4 /*yield*/, Promise.all(articles.map(function (article) { return __awaiter(_this, void 0, void 0, function () {
                            var duration, workingAudioUrl, audioType, metadata, err_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        duration = 0;
                                        audioType = article.audioWorking === 'audioUrl' ? 'audio/mpeg' : 'audio/mp4';
                                        if (article.audioWorking) {
                                            workingAudioUrl = article[article.audioWorking];
                                        }
                                        else {
                                            throw new Error('No audio URL');
                                        }
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, mm.fetchFromUrl(workingAudioUrl)];
                                    case 2:
                                        metadata = _a.sent();
                                        duration = metadata.format.duration || 123454;
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
                                                    url: workingAudioUrl,
                                                    type: audioType,
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
                    console.log('newItems', newItems);
                    allItems = __spreadArray(__spreadArray([], oldItems, true), newItems, true);
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
