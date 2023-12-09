import axios from 'axios';
const cheerio = require('cheerio');
import { forkJoin, from } from 'rxjs';
import { filter, map, switchMap, toArray } from 'rxjs/operators';
const dateArg = process.argv[2];
import * as fs from 'fs';
import * as xml2js from 'xml2js';
const reallysimple = require('reallysimple');
import * as mm from 'music-metadata-browser';
const he = require('he');

type Article = {
  title: string;
  description: string;
  byline: string;
  articleUrl: string;
  articleId: string;
  audioUrl: string;
  audmUrl: string;
  pubDate: string;
  audioWorking?: 'audmUrl' | 'audioUrl' | 'none';
};

type OldArticle = {
  title: string;
  description: string;
  author: string;
  pubDate: string;
  guid: string;
  length: string;
  enclosure: {
    url: string;
    type: string;
    length: string;
  };
};

// Define the URL you want to scrape
const url = dateArg
  ? `https://www.newyorker.com/magazine/${dateArg}`
  : 'https://www.newyorker.com/magazine/';

// Create an Observable from the axios promise
const http$ = from(axios.get(url));

function getNextMonday(): Date {
  const now = new Date();
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7));
  return nextMonday;
}

function formatDate(date: Date): string {
  const year = date.getFullYear().toString().slice(-2); // get last two digits of year
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // get month and pad with 0 if needed
  const day = date.getDate().toString().padStart(2, '0'); // get date and pad with 0 if needed
  return year + month + day;
}

http$
  .pipe(
    // Extract the HTML string from the axios response
    map((response) => response.data),
    // Parse the HTML string with cheerio
    // @ts-ignore
    map((html) => cheerio.load(html)),
    // Extract the data you're interested in
    map(($) => {
      const articles: Article[] = [];
      const articleId = $('meta[name="id"]').attr('content');
      // const articleId = $('meta[name="parsely-post-id"]').attr('content');
      // console.warn('id', articleId);

      // For each article
      $('ul[class^="River__list"] > li').each((index, element) => {
        // Scrape the title, description, and byline
        const title = $(element).find('h4').text();
        const articleUrl = $(element).find('a:has(h4)').attr('href');
        const description = $(element).find('h5').text();
        const byline = $(element).find('p[class^="Byline__by"]').text();
        let date = '';
        if (!dateArg) {
          date = formatDate(getNextMonday());
        } else {
          // Extract the date from the dateArg and rearrange parts
          const dateParts = dateArg.split('/');
          date = dateParts[0].slice(-2) + dateParts[1] + dateParts[2];
        }

        // Extract the last name from the byline
        const lastName = byline.split(' ').pop().toLowerCase();
        // Construct the audioUrl
        const audioUrl = `https://downloads.newyorker.com/mp3/${date}fa_fact_${lastName}_apple.mp3`;

        // Format the date
        const pubDate = dateArg ? new Date(dateArg) : getNextMonday();
        const options: Intl.DateTimeFormatOptions = {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
        };

        const formattedDate = pubDate.toLocaleDateString('en-US', options);
        // Add the article to the list
        articles.push({
          articleId: '0',
          title,
          description,
          byline,
          articleUrl: 'https://www.newyorker.com' + articleUrl,
          audioUrl,
          audmUrl: '',
          pubDate: formattedDate,
          audioWorking: 'none',
        });
      });
      return articles;
    }),
    switchMap((articles: Article[]) => {
      // Create an array of Observables, one for each article
      const requests = articles.map((article) => {
        return from(axios.get(article.articleUrl)).pipe(
          map((response) => cheerio.load(response.data)),
          map(($) => {
            let articleId = $('meta[name="id"]').attr('content');
            // Add the articleId to the article object
            article.articleId = articleId;
            const audmUrl = `https://static.nytimes.com/narrated-articles/audm-embed/newyorker/${articleId}.m4a`;
            article.audmUrl = audmUrl;
            return article;
          })
        );
      });

      // Return a new Observable that emits the articles once all requests have completed
      return forkJoin(requests);
    }),
    switchMap((articles: Article[]) => {
      console.warn('articles', articles);
      // Create an array of Observables, one for each article
      const requests: Promise<Article>[] = articles.map((article) => {
        return new Promise((resolve) => {
          // Send a GET request to the audioUrl
          axios
            .get(article.audioUrl)
            .then((response) => {
              // If the response contains the error message, the link is not working
              if (
                response.data.includes(
                  'This XML file does not appear to have any style information associated with it.'
                )
              ) {
                // If audioUrl is not working, check audmUrl
                axios
                  .get(article.audmUrl)
                  .then((response) => {
                    if (
                      response.data.includes(
                        'This XML file does not appear to have any style information associated with it.'
                      )
                    ) {
                      article.audioWorking = 'none';
                    } else {
                      article.audioWorking = 'audmUrl';
                    }
                    resolve(article);
                  })
                  .catch((error) => {
                    // If there's an error, the link is not working
                    article.audioWorking = 'none';
                    resolve(article);
                  });
              } else {
                article.audioWorking = 'audioUrl';
                resolve(article);
              }
            })
            .catch((error) => {
              // If there's an error, the link is not working
              article.audioWorking = 'none';
              resolve(article);
            });
        });
      });

      // Return a new Observable that emits the articles once all requests have completed
      return forkJoin(requests);
    }),
    // Flatten the Observable
    switchMap((articles: Article[]) => articles),
    filter((article: Article) => article.audioWorking !== 'none'),
    toArray()
  )
  .subscribe(
    async (articles) => {
      const currentFeed = await readFeed();
      updateFeed(currentFeed, articles);
    },
    (error) => console.error(error)
  );

async function readFeed() {
  const urlFeed = 'https://johnfewell.github.io/scrape/feed.xml';

  return new Promise((resolve, reject) => {
    reallysimple.readFeed(urlFeed, function (err, theFeed) {
      if (err) {
        console.log(err.message);
        reject(err);
      } else {
        resolve(theFeed);
      }
    });
  });
}

async function updateFeed(feed, articles: Article[]) {
  console.log('articles', articles);
  const oldItems = feed?.items.map((article: OldArticle) => {
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
      'itunes:duration': article.length,
      'itunes:subtitle': 'foo',
      guid: article.guid,
      pubDate: article.pubDate,
    };
  });
  // Create new items
  const newItems = await Promise.all(
    articles.map(async (article) => {
      let duration = 0;
      let workingAudioUrl: string;
      let audioType =
        article.audioWorking === 'audioUrl' ? 'audio/mpeg' : 'audio/mp4';

      if (article.audioWorking) {
        workingAudioUrl = article[article.audioWorking];
      } else {
        throw new Error('No audio URL');
      }
      try {
        const metadata = await mm.fetchFromUrl(workingAudioUrl);
        duration = metadata.format.duration || 123454;
        console.warn({ duration });
      } catch (err) {
        console.error(err);
      }

      return {
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
      };
    })
  );

  console.log('newItems', newItems);

  // Merge old and new items
  const allItems = [...oldItems, ...newItems];

  const itunesFeedItems = {
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
  // Create new feed object
  const newFeed = {
    rss: {
      $: {
        version: '2.0',
        'xmlns:itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd',
        'xmlns:content': 'http://purl.org/rss/1.0/modules/content/',
      },
      channel: {
        ...feed,
        ...itunesFeedItems,
        item: [...allItems],
      },
    },
  };

  // Convert the feed object back to RSS
  const builder = new xml2js.Builder({
    headless: false,
    renderOpts: {
      pretty: true,
      indent: ' ',
      newline: '\n',
    },
  });
  const xml = builder.buildObject(newFeed);

  // Write the updated XML back to the file
  fs.writeFile('feed.xml', xml, (err) => {
    if (err) {
      console.error('Error writing to file:', err);
    } else {
      console.log('Successfully wrote to file');
    }
  });
}
