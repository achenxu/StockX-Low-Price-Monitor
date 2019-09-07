const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const Webhook = require('webhook-discord');
const shoe = require('./Shoe');
const Shoe = shoe.Shoe;
const colourArr = [
  '#FF3855',
  '#FF7A00',
  '#FDFF00',
  '#87FF2A',
  '#4F86F7',
  '#DB91EF',
  '#6F2DA8'
];
const config = require(path.join(__dirname, 'config.json'));
let shoeUrl = config.shoeURL;

const requestURL = async () => {
  let shoeArr = [];
  //   for (let x = 0; x < shoeUrl.length; x++) {
  //let beforeTime = Date.now();

  try {
    let url = `https://stockx.com/${shoeUrl[0]}`;
    let response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        'Accept-Encoding': 'gzip, deflate, br',
        'sec-fetch-user': '?1'
      }
    });
    let $ = cheerio.load(response.data);

    let shoeName = $('h1').text();
    let sizeArr = getSizes($);
    let priceArr = getPrices($);
    let shoeImage = $('div.image-container > img').attr('src');

    shoeArr.push(new Shoe(shoeName, sizeArr, priceArr, url, shoeImage));

    console.log(shoeName, sizeArr, priceArr, shoeImage);
  } catch (e) {
    console.log(e);
  }

  //console.log("Time elapsed: [" + (Date.now() - beforeTime) / 1000 + "] " + shoeName);

  return shoeArr;
};

async function comparePrices(initialArr) {
  const Hook = new Webhook.Webhook(config.webhook);

  let compareArr = await requestURL();
  console.log(logTime() + 'Comparing prices...\n');

  // for (var x = 0; x < 2; x++) {
  for (var x = 0; x < initialArr.length; x++) {
    // for (var i = 0; i < 1; i++) {
    for (var i = 0; i < initialArr[x].prices.length; i++) {
      let initialPrice = initialArr[x].prices[i];
      let comparePrice = compareArr[x].prices[i];

      // let initialPrice = 1025;
      // let comparePrice = 917;

      //no need to compare if the price is 0
      if (comparePrice != 0) {
        if (comparePrice < initialPrice) {
          let priceDiff = ((initialPrice - comparePrice) / initialPrice) * 100;
          let priceDiffRound = Math.round(priceDiff * 10) / 10;

          if (priceDiffRound > 5) {
            console.log(
              logTime() +
                'SENDING WEBHOOK\n=============================\n' +
                compareArr[x].name +
                '\nSize: ' +
                compareArr[x].sizes[i] +
                '\nNew Low Price: $' +
                comparePrice +
                '.00' +
                '\nOld Price: $' +
                initialPrice +
                '.00' +
                '\n' +
                priceDiffRound +
                '% decrease in price\n'
            );

            const hookMsg = new Webhook.MessageBuilder()
              .setName('StockX Low Price Monitor')
              .setColor(colourArr[Math.floor(Math.random() * colourArr.length)])
              .setTitle(compareArr[x].name)
              .addField('Size: ' + compareArr[x].sizes[i], '')
              .addField('New Low Price: $' + comparePrice + '.00', '')
              .addField('', 'Old Price: $' + initialPrice + '.00')
              .addField('', priceDiffRound + '% decrease in price')
              .addField('Link: ' + compareArr[x].url)
              .setImage(compareArr[x].image);

            Hook.send(hookMsg);
          }
          initialArr[x].prices[i] = compareArr[x].prices[i];
        } else if (comparePrice > initialPrice) {
          //if the compare price is more than the initial, set the inital to the compare
          //initialArr[x].prices[i] = compareArr[x].prices[i];
        } else {
          //console.log('No change found');
        }
      }
    }
  }
}

const getSizes = $ => {
  let sizeArr = [];
  $(
    'div.mobile-header-inner > div.options > div.form-group > div.select-control > div.select-options > ul.list-unstyled > li.select-option > div.inset > div.title'
  ).each((i, el) => {
    let size = $(el).text();
    sizeArr.push(size);
  });
  return sizeArr;
};

//will return an array of prices
const getPrices = $ => {
  let priceArr = [];
  $(
    'div.mobile-header-inner > div.options > div.form-group > div.select-control > div.select-options > ul.list-unstyled > li.select-option > div.inset > div.subtitle'
  ).each((i, el) => {
    //price of shoe
    let price = $(el).text();
    //check if it isnt 0
    if (price.startsWith('$')) {
      //strip the dollar sign
      priceFilter = price.substr(1);
      //make int so we can compare
      priceArr.push(parseInt(priceFilter.replace(',', '')));
    } else priceArr.push(0);
  });
  return priceArr;
};

const main = async () => {
  if (config.webhook === '' || undefined) {
    console.error(
      'ERROR: Please enter a valid webhook URL in the config file\n'
    );
  } else {
    console.log(logTime() + 'Monitor starting...');
    console.log(logTime() + 'Scraping for initial prices');

    var initialArr = await requestURL();
    console.log(logTime() + 'Initial prices gathered\n');

    //   setInterval(async () => {
    //     await comparePrices(initialArr);
    //   }, config.interval);
  }
};

main();

function logTime() {
  let date = new Date();
  let h = formatTime(date.getHours(), 2);
  let m = formatTime(date.getMinutes(), 2);
  let s = formatTime(date.getSeconds(), 2);
  let ms = formatTime(date.getMilliseconds(), 3);
  return (date = '[' + h + ':' + m + ':' + s + ':' + ms + '] ');
}

function formatTime(x, n) {
  while (x.toString().length < n) {
    x = '0' + x;
  }
  return x;
}
