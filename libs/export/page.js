/**
 * Updated by Rohit on 1/10/19.
 */
var mkdirp    = require('mkdirp'),
    path      = require('path'),
    _ = require('lodash'),
    url = require('url'),
    fs = require('fs')
    when      = require('when'),
    guard       = require('when/guard'),
    parallel    = require('when/parallel'),
    sequence        = require('when/sequence'),
    async  = require('async'),
    limit = 3;
var asyncLoop = require('node-async-loop');

/**
 * Internal module Dependencies.
 */
var helper = require('../../libs/utils/helper.js');
// var querypageconfig = require('../query');
var dir = './query';

var entriesConfig = config.modules.entries,
    entriesFolderPath = path.resolve(config.data,entriesConfig.dirName);
    

var querypageconfig = helper.readFile(path.join(dir,"index.json"));
function ExtractPosts(){
    this.connection=helper.connect();
}

ExtractPosts.prototype = {
    putPosts: function(postsdetails, key){
        var self = this;
        var folderpath = entriesFolderPath+'/'+key;
        masterFolderPath = path.resolve(config.data, 'master',config.entryfolder);
        if (!fs.existsSync(folderpath)) {
            mkdirp.sync(folderpath);
            helper.writeFile(path.join(folderpath,"en-us.json"))
            mkdirp.sync(masterFolderPath);
            helper.writeFile(path.join(masterFolderPath, key+'.json'),'{"en-us":{}}')
        }
        var contenttype = helper.readFile(path.join(folderpath, "en-us.json"));
        var mastercontenttype = helper.readFile(path.join(masterFolderPath,key+".json"));

        return when.promise(function(resolve, reject) {
            var field_name = Object.keys(postsdetails[0]);
            var nid
            var image_details = [];
            postsdetails.map(function (data, index) {
                
                if(data.field_image_target_id && data.field_image_target_id != undefined) {
                    if(index == 0){
                        // data['field_image_target_id'] = {"uid":data.field_image_target_id,"filename": "Image.jpg"} 
                            image_details.push({"uid":data.field_image_target_id,"filename": "Image"+index+".jpg"})
                            data['field_image_target_id'] = image_details
                            nid = data.nid 
                    } else if(data.nid == nid){
                            image_details.push({"uid":data.field_image_target_id,"filename": "Image"+index+".jpg"})
                            data['field_image_target_id'] = image_details
                    } else {
                          image_details = []
                          image_details.push({"uid":data.field_image_target_id,"filename": "Image"+index+".jpg"})
                          data['field_image_target_id'] = image_details
                          nid = data.nid  
                    }
                  
                }
               
                 //console.log("jndjdjdndjjdnjd", data)

                var ct_value={};
                var date;
                for(var key in field_name){
                    var re = field_name[key].endsWith("_tid");
                    if(field_name[key] =="created"){
                      date = new Date(data[field_name[key]] * 1000);
                        ct_value[field_name[key]]=date.toDateString()
                    }
                    else if(field_name[key] =="uid_name"){
                        ct_value[field_name[key]]=[data[field_name[key]]]
                    }
                    else if(re){
                        ct_value[field_name[key]]=[data[field_name[key]]]
                    }
                    else{
                        ct_value[field_name[key]]=data[field_name[key]]
                    }
                    contenttype[data["nid"]]=ct_value
                    mastercontenttype["en-us"][data["nid"]]=""
                }
                ct_value["url"]="/"+data[field_name[1]]
                successLogger("Entry "+data["nid"]+" is exported");
            })
           /* mastercontenttype={
             "en-us":mastercontenttype
             }*/
            helper.writeFile(path.join(folderpath, 'en-us.json'), JSON.stringify(contenttype, null, 4))
            helper.writeFile(path.join(masterFolderPath, key+'.json'), JSON.stringify(mastercontenttype, null, 4))
            resolve({last:contenttype})

        })
    },
    getQuery: function (pagename, skip) {
        var self = this;
        return when.promise(function(resolve, reject) {
            var query = querypageconfig["page"][""+pagename+""];
            query = query + " limit " + skip + ", "+limit;
            self.connection.query(query, function(error, rows, fields) {
                if(!error){
                    if(rows.length>0){                                
                        self.putPosts(rows, pagename)
                            .then(function(results){
                                resolve(results);
                            })
                            .catch(function(){
                                reject()
                            })
                    }
                    else {
                        errorLogger("no entries found");
                        resolve();
                    }
                }else{
                    errorLogger('failed to get entries: ', error);
                    reject(error);
                }
            })
        })
    },
    getPageCount: function (pagename, countentry) {
        //console.log("pagename======<>>>>>>>>", pagename)
           //             console.log("countryentry======<>>>>>>>>", countentry)
        var self = this;
        return when.promise(function (resolve, reject) {
            var _getPage = [];
            for(var i = 0, total = countentry; i < total; i+=limit){
                _getPage.push(function (data) {
                    return function () {
                        return self.getQuery(pagename, data);
                    }
                }(i));
            }
            var guardTask = guard.bind(null, guard.n(1));
            _getPage = _getPage.map(guardTask);
            var taskResults = parallel(_getPage);
            taskResults
                .then(function(results) {
                    resolve();
                })
                .catch(function(e) {
                    errorLogger("something wrong while exporting entries"+pagename+":",e);
                    reject(e);
                })
        })
    },
    getPageCountQuery: function (pagename) {
        var self = this;
        return when.promise(function (resolve, reject) {
            var query = querypageconfig["count"][""+pagename+"Count"];
            self.connection.query(query, function (error, rows, fields) {
                if (!error) {
                    var countentry = rows[0]["countentry"];
                    if (countentry > 0) {
                        
                        self.getPageCount(pagename, countentry)
                            .then(function(){
                                resolve()
                            })
                            .catch(function(){
                                reject()
                            })
                    } else {
                        errorLogger("no entries found for "+pagename+" ...");
                        resolve();
                    }
                } else {
                    errorLogger("failed to get "+pagename+" count: ", error);
                    reject(error)
                }
            })
        })
    },
    getAllPosts: function() {
        var self = this;
        var dir = './query';
        return when.promise(function(resolve, reject) {
            var queryfile = helper.readFile(path.join(dir, "index.json"))
            var pagequery = queryfile.page;
            var _getPage = [];

            for(var key in pagequery){
                _getPage.push(function (key) {
                    return function () {
                        return self.getPageCountQuery(key)
                    }
                }(key));
            }
            var taskResults = sequence(_getPage);
            taskResults
                .then(function(results) {
                    self.connection.end();
                    resolve();
                })
                .catch(function(e) {
                    errorLogger("something wrong while exporting entries "+key+": ",e);
                    reject(e);
                })
        })
    },
    start: function () {
        successLogger("Exporting entries...");
        var self = this;
        return when.promise(function (resolve, reject) {
            self.getAllPosts()
                .then(function(){
                    resolve()
                })
                .catch(function(){
                    reject()
                })
        })
    }
}

module.exports = ExtractPosts;