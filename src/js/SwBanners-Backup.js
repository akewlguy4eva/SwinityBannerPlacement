/**************************************************************************************
 Swinity Banner Script.
 A script to read mutiple sources and replace banners setup with <INS tags
 or to do inline replaces.
 Ver: .01 - Do some setup for class etc..
 **************************************************************************************/
let Swinity = {
  Globals: {
    RootApi: "https://app.swinity.com/api",
    LogEnabled: true,
    BannerSpots: [],
    HttpCache: [],
  },
  Log: (txt,obj) => {
    if(Swinity.Globals.LogEnabled) {
      if(typeof obj === "undefined") {
        console.log(txt);
      } else {
        console.log(txt,obj);
      }
    }
  },
  MakeId: (length) => {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  },
  /**********************************************************************************
   The Below Functions Allow Me To Call HTTP Based APIS Without JQuery All Callz
   Are Supported Down To IE 3.0, And Any Other Browser In The Last 20 Years :)
   **********************************************************************************/
  HttpPostJson: (url,dta,headers,cb) => {
    try {
      let xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      if (typeof headers !== "undefined") {
        for (let k in headers) {
          xhr.setRequestHeader(k, headers[k]);
        }
      }
      xhr.setRequestHeader("Content-type","application/json");
      xhr.onload = () => {
        if (xhr.status === 200) {
          let obj = JSON.parse(xhr.responseText);
          cb(obj); return;
        } else {
          try { //Try To Read The JSON Output If Any
            let obj = JSON.parse(xhr.responseText);
            cb(obj); return;
          } catch (ex) {
          }
          cb({Code: xhr.status, Message: xhr.statusText}); return;
        }
      };
      xhr.send(JSON.stringify(dta));
    } catch (ex) {
      console.error("Error in Swinity.Globals.HttpPost: " + ex.toString(),{Url: url, Data: dta});
    }
  },
  HttpGet: (url,headers,cb,pb,uc=false) => {
    try {
      if(uc) {
        if(Swinity.Globals.HttpCache.filter((t) => {return t.Key === url}).length>0) {
          cb(Swinity.Globals.HttpCache.filter((t) => {return t.Key === url})[0].Value,pb);
          return;
        }
      }

      let xhr = new XMLHttpRequest();
      xhr.open("GET",url);
      if(typeof headers !== "undefined") {
        for(let k in headers) {
          xhr.setRequestHeader(k,headers[k]);
        }
      }
      xhr.onload = () => {
        if(xhr.status === 200) {
          let obj = JSON.parse(xhr.responseText);
          if(uc) {
            Swinity.Globals.HttpCache.push({Key: url, Value: obj});
          }
          cb(obj,pb); return;
        } else {
          try { //Try To Read The JSON Output If Any
            let obj = JSON.parse(xhr.responseText);
            cb(obj,pb); return;
          } catch (ex) {}
          cb({Code: xhr.status, Message: xhr.statusText},pb); return;
        }
      };
      xhr.send();
    } catch(ex) {
      console.error("Error in Swinity.Globals.HttpGet: " + ex.toString());
    }
  },
  Banners: {
    //Function to mimic the $(document).ready() functionality of jQuery
    OnReady: (cb) => {
      if (document.readyState!='loading') cb();
      // modern browsers
      else if (document.addEventListener) document.addEventListener('DOMContentLoaded', cb);
      else document.attachEvent('onreadystatechange', function(){
          if (document.readyState=='complete') cb();
        });
    },
    //This function loads the the page tags, and the banners for the spots
    Init: () => {
      try {
        Swinity.Globals.BannerSpots = [];
        Swinity.Banners.PlaceBanners();
      } catch(ex) {
        console.error("Error in Swinity.Banners.Init: " + ex.toString());
      }
    },

    //This Is Function To Call To Set The Current Banners
    PlaceBanners: (usecache=false) => {


      //Always Reload, Maybe They Added New :)
      Swinity.Globals.BannerSpots = [];
      Swinity.Globals.BannerSpots = Swinity.Banners.GetInsertTags();

      Swinity.Globals.BannerSpots.forEach((s) => {
        let ele = s.Element;
        ele.setAttribute("style","display: none");
        let headers = {
          "X-Alt-Referer": document.location.href
        };
        let qry = "";
        if(s.Country !== "") {
          qry += "&countryCode=" + s.Country;
        }
        Swinity.HttpGet(Swinity.Globals.RootApi + `/creatives/${s.Id}?channel=${s.Channel}&max=${s.Count}&minAdvertiseHere=${s.MinBuyAds}&maxAdvertiseHere=${s.MaxBuyAds}&min=${s.Min}${qry}`,headers,(data,pb) => {
          if(data.Code === 200) {

            data.Result.forEach((v,i) => {
              let rec = v.Creative;
              if(rec.Code == "ADVERTISEHERE") {
                let div = document.createElement("div");
                div.id=s.DomId + "-" + i;
                div.className=pb.Class + " site-banner-spot";
                let ext = document.getElementById(div.id);
                if(ext !== null) {
                  pb.Element.parentNode.replaceChild(div,ext);
                } else {
                  pb.Element.parentNode.appendChild(div);
                }
                let tmp = document.getElementById(s.BuyAdTemplate);
                if(tmp!==null) {
                  div.innerHTML = tmp.innerHTML;
                } else {
                  console.log("Could Not Read Template But Have Ads",s.BuyAdTemplate);
                }
              } else {
                let href = document.createElement("a");
                let img = document.createElement("img");
                href.id=s.DomId + "-" + i; href.href=rec.TargetUrl; href.target="_blank"; href.title=rec.Title; href.className=pb.Class + " site-banner-spot";
                img.src=rec.Url; img.alt=rec.Title; href.onclick = (e)=>{
                  try {
                    if(typeof window !== "undefined" && typeof window.ga !== "undefined") {
                      window.ga('send', 'event', 'Banner', 'Click', v.Click.Name);
                    }
                  } catch(gex) {}
                  try {
                    Swinity.HttpPostJson(Swinity.Globals.RootApi + `/creatives/click`,{Guid: v.Click.Guid},headers,()=>{});
                  } catch(aex) {}
                };s
                href.appendChild(img);
                let ext = document.getElementById(href.id);
                if(ext !== null) {
                  pb.Element.parentNode.replaceChild(href,ext);
                } else {
                  pb.Element.parentNode.appendChild(href);
                }
              }
            });

            //Remove any previous banners :) On Redo :)
            let col = document.getElementsByClassName("site-banner-spot");
            let eles = Array.from(col);
            for(let xInt=0; xInt<=eles.length-1; xInt++) {
              let nId = eles[xInt].id;
              let rem = false;
              if(eles[xInt].parentNode == pb.Element.parentNode) {
                rem=true;
                data.Result.forEach((v,i) => {
                  let cId = s.DomId + "-" + i;
                  if(cId == nId) {
                    rem=false;
                  }
                });
              }
              if(rem) {
                eles[xInt].parentNode.removeChild(eles[xInt]);
              }
            }
          }
        },s,usecache);
      });
    },
    GetAttributeString(obj,nme) {
      let t = obj.getAttribute(nme);
      return t === null ? "" : t;
    },
    //Function to get a list of insert tags using only standard JS callz, works down to IE 3.0 browsers(WIN 95)
    GetInsertTags: () => {
      let spots = [];
      try {
        let eles = document.getElementsByTagName("ins");
        for(let x=0; x<=eles.length-1; x++) {
          let hObj = eles.item(x);
          //console.log("Getting tag..",hObj);
          let tObj = {
            Element: hObj,
            Id:  Swinity.Banners.GetAttributeString(hObj,"data-key"),
            Channel: Swinity.Banners.GetAttributeString(hObj,"data-channel"),
            Class: Swinity.Banners.GetAttributeString(hObj,"data-class"),
            Count: isNaN(Swinity.Banners.GetAttributeString(hObj,"data-count")) ? "0" : Swinity.Banners.GetAttributeString(hObj,"data-count"),
            MinBuyAds: isNaN(Swinity.Banners.GetAttributeString(hObj,"data-minbuyads")) ? "0" : Swinity.Banners.GetAttributeString(hObj,"data-minbuyads"),
            MaxBuyAds: isNaN(Swinity.Banners.GetAttributeString(hObj,"data-maxbuyads")) ? "0" : Swinity.Banners.GetAttributeString(hObj,"data-maxbuyads"),
            Country: Swinity.Banners.GetAttributeString(hObj,"data-country"),
            BuyAdTemplate: Swinity.Banners.GetAttributeString(hObj,"data-buyadtemplate"),
            DomId: Swinity.Banners.GetAttributeString(hObj,"data-domid") == "" ? Swinity.MakeId(15) : Swinity.Banners.GetAttributeString(hObj,"data-domid"),
          };
          tObj.Min = isNaN(Swinity.Banners.GetAttributeString(hObj,"data-min")) ? tObj.Count : Swinity.Banners.GetAttributeString(hObj,"data-min");
          hObj.setAttribute("data-domid",tObj.DomId);
          if(tObj.Count > "0") {
            spots.push(tObj);
          }
        }
      } catch(ex) {
        console.error("Error in Swinity.Banners.GetInsertTags: " + ex.toString());
        throw ex;
      }
      return spots;
    },
  }
};
Swinity.Banners.OnReady(()=> {
  Swinity.Banners.Init(); //Call All Needed Jazz :)
});
