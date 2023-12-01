import axios from 'axios';
const cheerio = require('cheerio');
import { forkJoin, from } from 'rxjs';
import { filter, map, switchMap, toArray } from 'rxjs/operators';
const dateArg = process.argv[2];
import * as fs from 'fs';
import * as RSSParser from 'rss-parser';
import * as xml2js from 'xml2js';

type Article = {
  title: string;
  description: string;
  byline: string;
  audioUrl: string;
  pubDate: string;
  audioWorking?: boolean;
};

// Define the URL you want to scrape
const url = `https://www.newyorker.com/magazine/${dateArg}`;

// Create an Observable from the axios promise
const http$ = from(axios.get(url));

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
      // For each article
      $('ul[class^="River__list"] > li').each((index, element) => {
        // Scrape the title, description, and byline
        const title = $(element).find('h4').text();
        const description = $(element).find('h5').text();
        const byline = $(element).find('p[class^="Byline__by"]').text();

        // Extract the date from the url and rearrange parts
        const dateParts = url.split('/').slice(-3);
        const date = dateParts[0].slice(-2) + dateParts[1] + dateParts[2];

        // Extract the last name from the byline
        const lastName = byline.split(' ').pop().toLowerCase();

        // Construct the audioUrl
        const audioUrl = `https://downloads.newyorker.com/mp3/${date}fa_fact_${lastName}_apple.mp3`;
        // Format the date
        const pubDate = new Date(date);
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
          title,
          description,
          byline,
          audioUrl,
          pubDate: formattedDate,
        });
      });
      return articles;
    }),
    switchMap((articles: Article[]) => {
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
                article.audioWorking = false;
              } else {
                article.audioWorking = true;
              }
              resolve(article);
            })
            .catch((error) => {
              // If there's an error, the link is not working
              article.audioWorking = false;
              resolve(article);
            });
        });
      });

      // Return a new Observable that emits the articles once all requests have completed
      return forkJoin(requests);
    }),
    // Flatten the Observable
    switchMap((articles: Article[]) => articles),
    filter((article: Article) => article.audioWorking ?? false),
    toArray()
  )
  .subscribe(
    (data) => {
      updateFeed(data);
    },
    (error) => console.error(error)
  );

async function updateFeed(articles: Article[]) {
  const parser = new RSSParser();
  let feed;

  // Read the existing feed
  try {
    const data = fs.readFileSync('feed.xml', 'utf8');
    feed = await parser.parseString(data);
  } catch (err) {
    console.error('Error reading the file:', err);
    return;
  }

  // Create new items
  const newItems = articles.map((article) => ({
    title: article.title,
    description: article.description,
    enclosure: { url: article.audioUrl, type: 'audio/mpeg' },
    author: article.byline,
    pubDate: article.pubDate,
  }));

  console.log('feed', feed);

  // Merge old and new items
  const allItems = [...feed.items, ...newItems];

  // Create new feed object
  const newFeed = {
    rss: {
      $: {
        version: '2.0',
      },
      channel: [
        {
          ...feed,
          item: allItems,
        },
      ],
    },
  };

  // Convert the feed object back to RSS
  const builder = new xml2js.Builder({ headless: false });
  const xml = builder.buildObject(newFeed);
  console.log('new feed', xml);

  // Write the updated XML back to the file
  fs.writeFile('feed.xml', xml, (err) => {
    if (err) {
      console.error('Error writing to file:', err);
    } else {
      console.log('Successfully wrote to file');
    }
  });
}
