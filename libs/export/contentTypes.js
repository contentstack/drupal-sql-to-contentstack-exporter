/**
 * Updated by Rohit on 1/10/19.
 */
var mkdirp    = require('mkdirp'),
    path      = require('path'),
    _      = require('lodash'),
    fs = require('fs'),
    when      = require('when');
    phpUnserialize = require('phpunserialize');

/**
 * Internal module Dependencies.
 */
var helper = require('../../libs/utils/helper.js');

var contenttypesConfig = config.modules.contentTypes,
    contentTypesFolderPath = path.resolve(config.data,contenttypesConfig.dirName),
    masterFolderPath = path.resolve(config.data, 'master',config.entryfolder);
    validKeys = contenttypesConfig.validKeys;

/**
 * Create folders and files
 */
mkdirp.sync(contentTypesFolderPath);
mkdirp.sync(masterFolderPath);
if (!fs.existsSync(contentTypesFolderPath)) {
    mkdirp.sync(contentTypesFolderPath);
    helper.writeFile(path.join(contentTypesFolderPath,  contenttypesConfig.fileName))
    mkdirp.sync(masterFolderPath);
    helper.writeFile(path.join(masterFolderPath, contenttypesConfig.masterfile),'{"en-us":{}}')
}


function ExtractContentTypes(){
    this.master = {};
    this.priority = [];
    this.cycle   = [];
    this.connection=helper.connect();
}

ExtractContentTypes.prototype = {
    start :function() {
        var self = this;
        return when.promise(function(resolve, reject) {
            self.getcontenttypes()
                .then(function(results){
                    for (var key in self.master) {
                       self.detectCycle(key);
                    }
                    for (var key in self.master) {
                        self.setPriority(key);
                        self.cycle = [];
                    }
                    helper.writeFile(path.join(contentTypesFolderPath, '__priority.json'), self.priority);
                    helper.writeFile(path.join(contentTypesFolderPath, '__master.json'), self.master);
                    successLogger('Updated priority and reference/file field of Content Types.');
                    resolve();
                })
                .catch(function(error){
                    errorLogger(error);
                    return reject();
                })
        })

    },
    getcontenttypes: function(){
        var self = this;
        var details_data = [];
        return when.promise(function(resolve, reject) {
                var query=config["mysql-query"]["ct_mapped"];
            self.connection.query(query, function(error, rows, fields) {

                for(var i=0; i<rows.length; i++) {
                   var conv_details = phpUnserialize(rows[i].data)
                    details_data.push({field_name:conv_details.field_name, content_types:conv_details.bundle, type:conv_details.field_type})
                }

                    if(!error){
                        if(details_data.length>0){
                            self.putContentTypes(details_data)
                            self.connection.end();
                            resolve();
                        }else{
                            self.connection.end();
                            resolve();
                        }
                    }else{
                        self.connection.end();
                        reject(error);
                    }
                })            
        })
    },
    putContentTypes: function(contentdetails){
        var self =this;
        var count = 0;
        return when.promise(function(resolve, reject) {
            var content_types =[];
            var ct=Object.keys(_.keyBy(contentdetails,"content_types"));

            //Mapping for content type name and its field name

            ct.map(function (data, index) {
                var allkey=_.filter(contentdetails, { 'content_types': data });
                var allfield=[];
                var schema = [];
                var contenttypeTitle;
                allkey.map(function (data1, index) {
                  //  allfield.push({field_name:data1["field_name"],type:data1["type"]})

                  allfield.push({type:data1["type"]}) 
                    //Replace content type and field name
                    var fieldTitle;
                    var fd_name = data1["field_name"];
                    var newchar = " "
                    contenttypeTitle = data.split('_').join(newchar);
                    var fd_namestatus = fd_name.startsWith("field_");
                    if(fd_namestatus){
                        fieldTitle = fd_name.substring(6);
                    }else {
                        fieldTitle = data1["field_name"];
                    }
                   // console.log("dataa111======>>>", data1["type"])
                    // Pushed content type name and field in schema
                    switch (data1["type"]){
                        case "text_with_summary" :{
                            schema.push({
                                "data_type": "text",
                                "display_name": fieldTitle,
                                "uid": data1["field_name"]+'_value',
                                "field_metadata": {
                                    "allow_rich_text": true,
                                    "description": "",
                                    "multiline": false,
                                    "rich_text_type": "advanced"
                                },
                                "unique": false,
                                "mandatory": false,
                                "multiple": false
                            })
                        }break;
                        case "taxonomy_term_reference" :{
                                schema.push({
                                "data_type": "reference",
                                "display_name": fieldTitle,
                                "reference_to": "taxonomy",
                                "field_metadata": {
                                    "ref_multiple": true
                                },
                                "uid": data1["field_name"]+'_tid',
                                "multiple": false,
                                "mandatory": false,
                                "unique": false
                            })
                            
                        }break;
                        case "image" :{
                            schema.push({
                                "data_type": "file",
                                "display_name": fieldTitle,
                                "uid": data1["field_name"]+'_target_id',
                                "field_metadata": {
                                    "description": "",
                                    "rich_text_type": "standard"
                                },
                                "multiple": true,
                                "mandatory": false,
                                "unique": false
                            })
                        }break;
                        case "text_long" :{
                            schema.push({
                                "data_type": "text",
                                "display_name": fieldTitle,
                                "uid": data1["field_name"]+'_value',
                                "field_metadata": {
                                    "allow_rich_text": true,
                                    "description": "",
                                    "multiline": false,
                                    "rich_text_type": "advanced"
                                },
                                "unique": false,
                                "mandatory": false,
                                "multiple": false
                            })
                        }break;
                        case "file" :{
                            schema.push({
                                "data_type": "file",
                                "display_name": fieldTitle,
                                "uid": data1["field_name"]+'_target_id',
                                "field_metadata": {
                                    "description": "",
                                    "rich_text_type": "standard"
                                },
                                "multiple": false,
                                "mandatory": false,
                                "unique": false
                            })
                        }break;
                        case "text" :{
                            schema.push({
                                "data_type": "text",
                                "display_name": fieldTitle,
                                "uid": data1["field_name"]+'_value',
                                "field_metadata": {
                                    "description": "",
                                    "default_value": "",
                                    "multiline": true,
                                    "error_message": ""
                                },
                                "format": "",
                                "multiple": false,
                                "mandatory": false,
                                "unique": false
                            })
                        }break;
                        case "list_boolean" :{
                            schema.push({
                                "data_type": "boolean",
                                "display_name": fieldTitle,
                                "uid": data1["field_name"],
                                "field_metadata": {
                                    "description": "",
                                    "default_value": ""
                                },
                                "multiple": false,
                                "mandatory": false,
                                "unique": false
                            })
                        }break;
                        case "datetime" :{
                            schema.push({
                                "data_type": "isodate",
                                "display_name": fieldTitle,
                                "uid": data1["field_name"],
                                "field_metadata": {
                                    "description": "",
                                    "default_value": ""
                                },
                                "multiple": false,
                                "mandatory": false,
                                "unique": false
                            })
                        }break;
                        case "integer" :{
                            schema.push({
                                "data_type": "number",
                                "display_name": fieldTitle,
                                "uid": data1["field_name"],
                                "field_metadata": {
                                    "description": "",
                                    "default_value": ""
                                },
                                "multiple": false,
                                "mandatory": false,
                                "unique": false
                            })
                        }break;
                        default :{
                            schema.push({
                                "data_type": "text",
                                "display_name": fieldTitle,
                                "uid": data1["field_name"]+'_value',
                                "field_metadata": {
                                    "description": "",
                                    "default_value": "",
                                    "error_message": ""
                                },
                                "format": "",
                                "multiple": false,
                                "mandatory": false,
                                "unique": false
                            })
                        }
                    }
                })
                schema.unshift({
                        "display_name": "Title",
                        "uid": "title",
                        "data_type": "text",
                        "mandatory": false,
                        "unique": false,
                        "field_metadata": {
                            "_default": true
                        },
                        "multiple": false
                    },
                    {
                        "display_name": "URL",
                        "uid": "url",
                        "data_type": "text",
                        "mandatory": false,
                        "field_metadata": {
                            "_default": true
                        },
                        "multiple": false,
                        "unique": false
                    },
                    {
                        "data_type": "reference",
                        "display_name": "User Name",
                        "reference_to": "authors",
                        "field_metadata": {
                            "ref_multiple": true
                        },
                        "uid": "uid_name",
                        "multiple": false,
                        "mandatory": false,
                        "unique": false
                    },
                    {
                        "data_type": "text",
                        "display_name": "Created Date",
                        "uid": "created",
                        "field_metadata": {
                            "description": "",
                            "default_value": "",
                            "error_message": ""
                        },
                        "format": "",
                        "multiple": false,
                        "mandatory": false,
                        "unique": false
                    }
                )
                var main = {
                    title : contenttypeTitle,
                    uid : data,
                    schema: schema
                }
                count++;
                content_types.push(main)
            })
            var entry = {
                "content_types":content_types
            }
            self.putfield(entry, count);
            resolve();
        })
    },
    putfield: function (entry, count) {
        var self = this;
        return when.promise(function (resolve, reject) {
            var authors = helper.readFile(path.join(__dirname,"../authors.json"))
            var taxonomy = helper.readFile(path.join(__dirname,"../taxonomy.json"))
            var vocabulary = helper.readFile(path.join(__dirname,"../vocabulary.json"))
            helper.writeFile(path.join(contentTypesFolderPath,"taxonomy.json"), JSON.stringify(taxonomy, null, 4))
            helper.writeFile(path.join(contentTypesFolderPath,"vocabulary.json"),JSON.stringify(vocabulary, null, 4))
            helper.writeFile(path.join(contentTypesFolderPath,"authors.json"), JSON.stringify(authors, null, 4))
            entry.content_types.unshift(authors,vocabulary,taxonomy);

            count = count + 4
            for (var i = 0, total = count; i < total; i++) {
                var contentType = {},
                    temp = {
                        uid: '',
                        references: [

                        ],
                        fields: {
                            file: [],
                            reference: []
                        }
                    };
                for (var j = 0, jTotal = validKeys.length; j < jTotal; j++) {
                    contentType[validKeys[j]] = entry.content_types[i][validKeys[j]];
                    if (validKeys[j] == 'uid') {
                        temp['uid'] = contentType['uid'];
                    } else if (validKeys[j] == 'schema') {
                        temp['references'] = getFileFields(contentType['schema']);
                        self.getReferenceAndFileFields(contentType['schema'], temp);
                    }
                }
                helper.writeFile(path.join(contentTypesFolderPath, contentType['uid'] + '.json'), contentType);
                successLogger("ContentType "+contentType['uid']+" successfully migrated")
                self.master[contentType['uid']] = temp;
                resolve();
            }
        })
    },
    getReferenceAndFileFields: function(schema, temp){
        if (schema) {
            for (var i = 0, total = schema.length; i < total; i++) {
                switch (schema[i]['data_type']) {
                    /* case 'reference':
                     (temp['references'].indexOf(schema[i]['reference_to']) == -1) ? temp['references'].push(schema[i]['reference_to']) : '';*/
                    case 'file':
                        (temp['fields'][schema[i]['data_type']].indexOf(schema[i]['uid']) == -1) ? temp['fields'][schema[i]['data_type']].push(schema[i]['uid']) : '';
                        break;
                    case 'group':
                        this.getReferenceAndFileFields(schema[i]['schema'], temp);
                }
            }
        }
    },
    setPriority: function(content_type_uid){
        var self = this;
        self.cycle.push(content_type_uid);
        if (self.master[content_type_uid] && self.master[content_type_uid]['references'].length && self.priority.indexOf(content_type_uid) == -1) {
            for (var i = 0, total = self.master[content_type_uid]['references'].length; i < total; i++) {
                if (self.master[content_type_uid]['references'][i]['content_type_uid'] === content_type_uid || self.cycle.indexOf(content_type_uid) > -1){
                    //self.cycle = [];
                    continue;
                }
                self.setPriority(self.master[content_type_uid]['references'][i]['content_type_uid']);
            }
        }
        if (self.priority.indexOf(content_type_uid) == -1){
            self.priority.push(content_type_uid);
        }
    },
    detectCycle: function(content_type_uid) {
        try{
            var self = this;
            var refMapping = self.master;
            var seenObjects = [];
            var cyclicContentTypes = [];
            function detect (key) {
                seenObjects.push(key);
                refMapping[key]['references'].map(function(ref, index){
                    if(seenObjects.indexOf(ref.content_type_uid) == -1) {
                        detect(ref.content_type_uid);
                    } else {
                        self.master[key]['references'][index]['isCycle'] = true;
                        cyclicContentTypes.push(ref.content_type_uid);
                        return seenObjects;
                    }
                })
            }
            detect(content_type_uid);
            return cyclicContentTypes;
        } catch(e){
            errorLogger(e)
        }

    }
}
function getFileFields(schema){
    var references = [];

    var x = traverseSchemaWithPath(schema, function(path, entryPath, field) {
        if (field.data_type === 'reference') {
            references.push({uid: field.uid, path: path, entryPath: entryPath, content_type_uid: field.reference_to})
        }
    }, false);

    return references;
}

/*
 Find out file's
 */
function traverseSchemaWithPath(schema, fn, path, entryPath) {
    path = path || ''
    entryPath = entryPath || ''

    function getPath(uid) {
        return _.isEmpty(path) ? uid : [path, uid].join('.')
    }

    function getEntryPath(uid) {
        return _.isEmpty(entryPath) ? uid : [entryPath, uid].join('.')
    }

    var promises = schema.map(function(field, index) {
        var pth = getPath("schema["+index+"]")
        var entryPth = ""
        field.data_type === 'group' && field.multiple ? entryPth = getEntryPath(field.uid)+"[]" : entryPth = getEntryPath(field.uid)
        if (field.data_type === 'group') {
            return traverseSchemaWithPath(field.schema, fn, pth, entryPth)
        }

        return fn(pth, entryPth, field)
    })

    return _.flatten(_.compact(promises))
}

module.exports = ExtractContentTypes;