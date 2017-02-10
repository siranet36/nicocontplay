function getCommURL() {
  console.log("getCommURL");
  var url;
  var elements = document.getElementsByClassName('commu_info') ;
  if (elements.length > 0) {
    var elements2 = elements[0].getElementsByTagName('a');
    url = elements2[0].href;
  } else {
    elements = document.getElementsByClassName('smn') ;
   if (elements.length > 0) {
      var elements2 = elements[0].getElementsByTagName('a');
      url = elements2[0].href;
   } else {
      elements = document.getElementsByClassName('community-info-title') ;
     if (elements.length > 0) {
        var elements2 = elements[0].getElementsByTagName('a');
        url = elements2[0].href;
     }
   }
  }

  console.log("url "+url);
  return url;
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
debugger;
  console.log(request);
  var tabid = request.tabid;
  var taburl = request.taburl;
  var url = getCommURL();
  var response = {tabid : tabid, taburl: taburl, url: url};
  sendResponse(response);
  return true;
});
