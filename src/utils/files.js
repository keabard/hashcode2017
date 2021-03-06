const fs = require("fs");
const RequestDescription = require("../models/request-description");
const Cache = require("../models/cache");
const Endpoint = require("../models/endpoint");
const EndpointInfo = require("../models/endpoint-info");

const Video = require('../models/video');
const _ = require('lodash');
module.exports = {

  fileReader: filePath => {

    const videos = [];
    const endpoints = [];
    const requests = [];
    const caches = [];
    let numberOfVideos = 0;
    let numberOfEndpoints = 0;
    let numberOfRequestDescriptions = 0;
    let cacheSize = 0;

    const fileContent = fs.readFileSync(filePath, {encoding: 'utf-8'});
    let splittedContent = fileContent.split('\n');
    [numberOfVideos, numberOfEndpoints, numberOfRequestDescriptions, numberOfCaches, cacheSize] = splittedContent[0].split(' ').map((number) => parseInt(number));
    splittedContent[1].split(' ').forEach((videoSize, index) => {
      const video = new Video(index, videoSize);
      videos.push(video);
    });
    splittedContent = splittedContent.slice(2, splittedContent.length);
    let lineIndex = 0;

    for (let endpointIndex = 0; endpointIndex < numberOfEndpoints; endpointIndex++) {
      let endpointLatency, numberOfCaches;
      [endpointLatency, numberOfCaches] = splittedContent[lineIndex].split(' ');
      const endpoint = new Endpoint(endpointIndex, endpointLatency);
      endpoints.push(endpoint);
      lineIndex++;
      for (let cacheIndex = 0; cacheIndex < numberOfCaches; cacheIndex++) {
        let cacheId, cacheLatency, cache;
        [cacheId, cacheLatency] = splittedContent[lineIndex].split(' ');
        cache = _.find(caches, {id: cacheId});
        if (!cache) {
          cache = new Cache(cacheId, cacheSize);
          caches.push(cache);
        }
        const endpointInfo = new EndpointInfo(cacheLatency, endpoint);
        cache.endpointInfos.push(endpointInfo);
        endpoint.caches.push(cache);
        lineIndex++;
      }
    }

    splittedContent = splittedContent.slice(lineIndex, splittedContent.length);
    // console.log(numberOfRequestDescriptions);
    for (let requestIndex = 0; requestIndex < numberOfRequestDescriptions; requestIndex++) {
      let requestId, endpointId, numberOfRequests;
      [requestId, endpointId, numberOfRequests] = splittedContent[requestIndex].split(' ');
      const request = new RequestDescription(requestId, endpointId, numberOfRequests);
      requests.push(request);
    }

    const requestsByEndpoint = _.groupBy(requests, r => {
      return r.endpointId;
    });


    // console.log(requestsByEndpoint);

    for (let requestByE in requestsByEndpoint) {
      endpoints[requestsByEndpoint[requestByE][0].endpointId].requests = RequestDescription.computeMapRequest(requestsByEndpoint[requestByE]);
    }

    return [videos, endpoints, caches, requests];
  }
};