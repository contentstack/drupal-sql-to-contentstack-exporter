/**
 * Updated by Rohit on 1/10/19.
 */
var mkdirp    = require('mkdirp'),
    path      = require('path'),
    fs = require('fs'),
    when      = require('when'),
    guard       = require('when/guard'),
    parallel    = require('when/parallel');

/**
 * Internal module Dependencies.
 */
var helper = require('../../libs/utils/helper.js');

var vocabularyConfig = config.modules.taxonomy,
    vocabularyFolderPath = path.resolve(config.data, config.entryfolder,vocabularyConfig.dirName),
    masterFolderPath = path.resolve(config.data, 'master',config.entryfolder),
    limit = 100;

/**
 * Create folders and files
 */
if (!fs.existsSync(vocabularyFolderPath)) {
    mkdirp.sync(vocabularyFolderPath);
    helper.writeFile(path.join(vocabularyFolderPath,  vocabularyConfig.fileName))
    mkdirp.sync(masterFolderPath);
    helper.writeFile(path.join(masterFolderPath, vocabularyConfig.masterfile),'{"en-us":{}}')
}


function ExtractTaxonomy(){
    this.connection=helper.connect();
}

ExtractTaxonomy.prototype = {
    putTaxonomy: function(categorydetails){
        return when.promise(function(resolve, reject) {
            var categorydata = helper.readFile(path.join(vocabularyFolderPath, vocabularyConfig.fileName));
            var categorymaster =helper.readFile(path.join(masterFolderPath, vocabularyConfig.masterfile));

            categorydetails.map(function (data, index) {
                var parent = data['parent']
                if(parent !=0 ){
                    categorydata[data['tid']] = {
                        "title":data['title'],
                        "description":data['description'],
                        "vid":[""+data['name']+""],
                        "parent":[""+data['parent']+""]
                    }

                }else{
                    categorydata[data['tid']] = {
                        "title": data['title'],
                        "description": data['description'],
                        "vid":[""+data['name']+""]
                    }
                }
                categorymaster["en-us"][data['tid']]=""
                successLogger("exported taxonomy term data tid " +"'"+data['tid']+"'");
            })
            helper.writeFile(path.join(vocabularyFolderPath, vocabularyConfig.fileName), JSON.stringify(categorydata, null, 4))
            helper.writeFile(path.join(masterFolderPath, vocabularyConfig.masterfile), JSON.stringify(categorymaster, null, 4))
            resolve();
        })
    },
    getTaxonomyTermData:function (skip) {
        var self = this;
        return when.promise(function(resolve, reject){
            // self.connection.connect()
            var query=config["mysql-query"]["taxonomy_term_data"];
            query = query + " limit " + skip + ", "+limit;
            self.connection.query(query, function(error, rows, fields) {
                if(!error){
                    if(rows.length>0){
                        self.putTaxonomy(rows)
                        resolve();
                    }
                }else{
                    errorLogger('failed to get taxonomy: ', error);
                    reject(error);
                }
            })
        })
    },
    getTaxonomyCount: function (taxanomycount) {
        var self = this;
        return when.promise(function (resolve, reject) {
            var _gettaxonomy = [];
            for(var i = 0,total = taxanomycount;i < total; i+=limit){
                _gettaxonomy.push(function (data) {
                    return function () {
                        return self.getTaxonomyTermData(data)
                    }
                }(i));
            }
            var guardTask = guard.bind(null, guard.n(1));
            _gettaxonomy = _gettaxonomy.map(guardTask);
            var taskResults = parallel(_gettaxonomy);
            taskResults
                .then(function(results) {
                    self.connection.end();
                    resolve();
                })
                .catch(function(e) {
                    errorLogger("something wrong while exporting taxonomy:",e);
                    reject(e);
                })
        })
    },
    start: function () {
        successLogger("exporting taxonomy...");
        var self = this;
        return when.promise(function(resolve, reject) {
            self.connection.connect()
            var query = config["mysql-query"]["taxonomyCount"];
            self.connection.query(query, function (error, rows, fields) {
                if(!error){
                    var taxanomycount = rows[0].taxonomycount;
                    if(taxanomycount > 0){
                        self.getTaxonomyCount(taxanomycount)
                        .then(function () {
                            resolve()
                        })
                        .catch(function () {
                            reject()
                        })
                    }
                    else {
                        errorLogger("no taxonomy found");
                        self.connection.end();
                        resolve();
                    }
                }
                else {
                    errorLogger('failed to get taxonomy count: ', error);
                    self.connection.end();
                    reject(error)
                }
            })
        })
    }
}

module.exports = ExtractTaxonomy;