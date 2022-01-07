const parser = require('xml2js').parseString;
const crypto = require('crypto');
const bencode = require('bencode');
const util = require('./util');

const parseXml = util.promisify(parser);

const _getTorrents = async function (rssUrl) {
  let res;
  res = await util.requestPromise(rssUrl + '&____=' + Math.random());
  res = await parseXml(res.body);
  const torrents = [];
  const items = res.rss.channel[0].item;
  for (let i = 0; i < items.length; ++i) {
    const torrent = {
      size: 0,
      name: '',
      hash: '',
      id: 0,
      url: '',
      link: ''
    };
    torrent.size = items[i].enclosure[0].$.length;
    torrent.name = items[i].title[0];
    torrent.hash = items[i].guid[0]._ || items[i].guid[0];
    const link = items[i].link[0];
    torrent.link = link;
    torrent.id = link.substring(link.indexOf('?id=') + 4);
    torrent.url = items[i].enclosure[0].$.url;
    torrents.push(torrent);
  }
  return torrents;
};

const _getTorrentsFileList = async function (rssUrl) {
  let res;
  res = await util.requestPromise(rssUrl + '&____=' + Math.random());
  res = await parseXml(res.body);
  const torrents = [];
  const items = res.rss.channel[0].item;
  for (let i = 0; i < items.length; ++i) {
    const torrent = {
      size: 0,
      name: '',
      hash: '',
      id: 0,
      url: '',
      link: ''
    };
    const size = items[i].description[0].match(/Size: (\d*\.\d*|\d*) (GB|MB|TB|KB)/)[0];
    const map = {
      KB: 1000,
      MB: 1000 * 1000,
      GB: 1000 * 1000 * 1000,
      TB: 1000 * 1000 * 1000 * 1000
    };
    const regRes = size.match(/Size: (\d*\.\d*|\d*) (GB|MB|TB|KB)/);
    torrent.size = parseFloat(regRes[1]) * map[regRes[2]];
    torrent.name = items[i].title[0].split('\n')[0];
    const link = items[i].link[0].match(/https:\/\/filelist.io\/download\.php\?id=\d*/)[0].replace('download', 'detailes');
    torrent.link = link;
    torrent.id = link.substring(link.indexOf('?id=') + 4);
    torrent.hash = 'fakehash' + torrent.id + 'fakehash';
    torrent.url = items[i].link[0];
    torrents.push(torrent);
  }
  return torrents;
};

const _getTorrentsBluTopia = async function (rssUrl) {
  let res;
  res = await util.requestPromise(rssUrl + '?____=' + Math.random());
  res = await parseXml(res.body);
  const torrents = [];
  const items = res.rss.channel[0].item;
  for (let i = 0; i < items.length; ++i) {
    const torrent = {
      size: 0,
      name: '',
      hash: '',
      id: 0,
      url: '',
      link: ''
    };
    const size = items[i].description[0].match(/Size<\/strong>: (\d*\.\d*|\d*) (GiB|MiB|TiB|KiB)/)[0];
    const map = {
      KiB: 1024,
      MiB: 1024 * 1024,
      GiB: 1024 * 1024 * 1024,
      TiB: 1024 * 1024 * 1024 * 1024
    };
    const regRes = size.match(/Size<\/strong>: (\d*\.\d*|\d*) (GiB|MiB|TiB|KiB)/);
    torrent.size = parseFloat(regRes[1]) * map[regRes[2]];
    torrent.name = items[i].title[0];
    const link = items[i].link[0];
    torrent.link = link;
    torrent.id = link.match(/torrents\/(\d*)/)[1];
    torrent.hash = 'fakehash' + torrent.id + 'fakehash';
    torrent.url = items[i].enclosure[0].$.url;
    torrents.push(torrent);
  }
  return torrents;
};

const _getTorrentsWrapper = {
  'filelist.io': _getTorrentsFileList,
  'blutopia.xyz': _getTorrentsBluTopia
};

exports.getTorrents = async function (rssUrl) {
  const host = new URL(rssUrl).host;
  if (_getTorrentsWrapper[host]) {
    return await _getTorrentsWrapper[host](rssUrl);
  }
  return await _getTorrents(rssUrl);
};

exports.getTorrentName = async function (url) {
  const res = await util.requestPromise({
    url: url,
    method: 'HEAD'
  });
  const dis = res.headers['content-disposition'];
  const filename = dis.substring(dis.indexOf('filename=') + 9);
  return decodeURIComponent(filename);
};

exports.getTorrentNameByBencode = async function (url) {
  const res = await util.requestPromise({
    url: url,
    method: 'GET',
    encoding: null
  });
  const buffer = Buffer.from(res.body, 'utf-8');
  const torrent = bencode.decode(buffer);
  const fsHash = crypto.createHash('sha1');
  fsHash.update(bencode.encode(torrent.info));
  const md5 = fsHash.digest('md5');
  let hash = '';
  for (const v of md5) {
    hash += v < 16 ? '0' + v.toString(16) : v.toString(16);
  }
  return {
    hash,
    name: torrent.info.name.toString()
  };
};