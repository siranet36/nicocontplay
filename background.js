var pollInterval = 1;  // minute
var requestTimeout = 1000 * 2;  // 2 seconds
var tabURLs = {};
var commURLs = {};
var liveURLs = {};
var retryN = 10;
var retryTimeout = 1000 * 7;  // 10 seconds
var failCounts = {};
var retryTimerId;

function startRequest(params) {
  console.log('startRequest');
  if (params && params.scheduleRequest) scheduleRequest();

  for (var tabid in tabURLs) {
    getCommURL(tabid);
    getLiveURL(tabid);
  }
}

function getCommURL(tabid) {
  var tabURL_ = tabURLs[tabid];
  console.log("getCommURL "+ tabid + " " + tabURL_ );
  if (!commURLs[tabURL_]) {
    console.log("chrome.tabs.sendMessage "+ tabid);
    chrome.tabs.sendMessage(parseInt(tabid, 10), { tabid : tabid, taburl : tabURL_ }, function(response) {
      if (response) {
        commURLs[response.taburl] = response.url;

        var tabid = response.tabid;
        getLiveURL(tabid);
      }
    });
  }
}

function getFeedUrl(url) {
  console.log("https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22"+encodeURIComponent(url)+"?rnd="+new Date().getTime()+"%22%20and%20xpath%3D%22%2F%2Fa%5B%40class%3D'now_live_inner'%5D%22&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys");
  return "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22"+encodeURIComponent(url)+"?rnd="+new Date().getTime()+"%22%20and%20xpath%3D%22%2F%2Fa%5B%40class%3D'now_live_inner'%5D%22&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys";
}

function getLiveURL(tabid) {
  console.log('getLiveURL ' + tabid);

  var tabURL_ = tabURLs[tabid];
  var commURL_ = commURLs[tabURL_];

  var xhr = new XMLHttpRequest();
  var abortTimerId = window.setTimeout(function() {
    xhr.abort();
  }, requestTimeout);

  var liveURL_;

  function handleSuccess() {
    console.log('handleSuccess');
    window.clearTimeout(abortTimerId);
    liveURLs[commURL_] = liveURL_;

    var tabURL__ = tabURLs[tabid];
    var commURL__ = commURLs[tabURL__];
    var liveURL__ = liveURLs[commURL__];

    console.log('liveURLs  ['+commURL__+'] ' + liveURL__);
    var tabLv_ =  tabURL__.match(/lv\d+$/)[0];
    var liveLv_ =  liveURL__.match(/lv\d+$/)[0];
    if (liveLv_ && liveLv_ != tabLv_) {
      console.log("tabs.update " + tabid);
      chrome.tabs.update(parseInt(tabid, 10), { url: liveURL__ });
    }
  }

  try {
    xhr.onreadystatechange = function() {
      if (xhr.readyState != 4)
        return;
      console.log('xhr.readyState ' + xhr.readyState);
      var result = JSON.parse(xhr.responseText).query.results;
      if (result !== null) {
        liveURL_ = result.a[0].href.replace(/\?.*$/,"");
        if (liveURL_ !== null) {
          handleSuccess();
          failCounts[commURL_] = 0;
        }
      } else {
        failCounts[commURL_] = failCounts[commURL_] + 1;
        console.log('failCounts['+commURL_+'] ' + failCounts[commURL_]);
        if (failCounts[commURL_] <= retryN) {
          if (retryTimerId) {
            window.clearTimeout(retryTimerId);
          }
          retryTimerId = window.setTimeout(function() {
            startRequest({scheduleRequest:true});
          }, retryTimeout);
        }
      }
    };

    xhr.open("GET", getFeedUrl(commURL_), true);
    xhr.send(null);
  } catch(e) {
    console.error("exception ", e);
  }
}

function scheduleRequest() {
  console.log('scheduleRequest');
  var delay = pollInterval;
  console.log('Scheduling for: ' + delay);
  console.log('Creating alarm');
  chrome.alarms.create('refresh', {periodInMinutes: delay});
}

function onAlarm(alarm) {
  console.log('Got alarm', alarm);
  if (alarm && alarm.name == 'watchdog') {
    onWatchdog();
  } else {
    startRequest({scheduleRequest:true});
  }
}

function onWatchdog() {
  console.log('onWatchdog');

  chrome.tabs.query({},function(tabs){
    for (var tabid in tabURLs) {
      var count = 0;
      tabs.forEach(function(tab){
        console.log('tabid '+tabid +' tab.id '+tab.id);
        if (tabid == tab.id){
          count++;
        }
      });
      if (count == 0) {
        console.log('clear '+tabid);
        var tabURL_ = tabURLs[tabid];
        var commURL_ = commURLs[tabURL_];
        if (tabid in tabURLs) {
          delete tabURLs[tabid];
        }
        if (tabURL_ in commURLs) {
          delete commURLs[tabURL_];
        }
        if (commURL_ in liveURLs) {
          delete liveURLs[commURL_];
        }
      }
    }
  });

  chrome.alarms.get('refresh', function(alarm) {
    if (alarm) {
      console.log('Refresh alarm exists. Yay.');
    } else {
      console.log('Refresh alarm doesn\'t exist!? ' +
                  'Refreshing now and rescheduling.');
      startRequest({scheduleRequest:true});
    }
  });
}

chrome.alarms.onAlarm.addListener(onAlarm);

chrome.runtime.onInstalled.addListener(function() {
  console.log('chrome.runtime.onInstalled.addListener');

  startRequest({scheduleRequest:true});
  chrome.alarms.create('watchdog', {periodInMinutes:5});
});

function manageTab(tab) {
  var tabid = tab.id;
  console.log('manageTab ' + tabid);
  var tabURL;
  if (tab.id && tab.url) {
    tabURL = tab.url.toString().replace(/\?.*$/,"");
    console.log('tabURL ' + tabURL);
    if (tabURL && tabURL.match(/http:\/\/\w+.nicovideo.jp\/\w+\/(lv\d+)/)) {
      if (tabURLs[tabid] !== tabURL) {
        var tabURL_ = tabURLs[tabid];
        var commURL_ = commURLs[tabURL_];

        if (tabURL_ in commURLs) {
          delete commURLs[tabURL_];
        }
        if (commURL_ in liveURLs) {
          delete liveURLs[commURL_];
        }
        if (commURL_ in failCounts) {
          delete failCounts[commURL_];
        }

        tabURLs[tabid] = tabURL;
      }
    } else {
      var tabURL_ = tabURLs[tabid];
      var commURL_ = commURLs[tabURL_];

      if (tabid in tabURLs) {
        delete tabURLs[tabid];
      }
      if (tabURL_ in commURLs) {
        delete commURLs[tabURL_];
      }
      if (commURL_ in liveURLs) {
        delete liveURLs[commURL_];
      }
      if (commURL_ in failCounts) {
        delete failCounts[commURL_];
      }
    }
  }
}

chrome.tabs.onUpdated.addListener(function(tabid, changeInfo, tab) {
  console.log('chrome.tabs.onUpdated ' + tabid + " " + changeInfo.status );
  if ( changeInfo.status === "complete") {
    manageTab(tab);
    startRequest({scheduleRequest:true});
  }
});

chrome.tabs.onRemoved.addListener(function(tabid, removeInfo) {
  console.log('chrome.tabs.onRemoved ' + tabid);
  var tabURL_ = tabURLs[tabid];
  var commURL_ = commURLs[tabURL_];

  if (tabid in tabURLs) {
    delete tabURLs[tabid];
  }
  if (tabURL_ in commURLs) {
    delete commURLs[tabURL_];
  }
  if (commURL_ in liveURLs) {
    delete liveURLs[commURL_];
  }
});

