/**
 * Updated by Rohit on 1/10/19.
 */
var mkdirp    = require('mkdirp'),
    path      = require('path'),
    _      = require('lodash'),
    fs = require('fs'),
    when      = require('when');
    phpUnserialize = require('phpunserialize');

var helper = require('../../libs/utils/helper.js');
function Extractfield() {
    this.connection=helper.connect();
}
Extractfield.prototype = {
    getQuery : function (data1) {
        var self = this;
        return when.promise(function(resolve, reject){
            var value = data1["field_name"]
            var query= "SELECT * FROM"+" "+"node__"+value;
            var field_value ;
            self.connection.query(query, function(error, rows, fields) {
                
                if(!error){
                        // if(rows.length>0){
                            var fd_table=[];                       
                            for(var field in fields) {

                                if(fields[field].name == value+"_value"){
                                    fd_table = "node__"+data1["field_name"]+"."+fields[field].name;
                                    //resolve(fd_table);
                                }
                                if(fields[field].name == value+"_fid"){
                                     fd_table = "node__"+data1["field_name"]+"."+fields[field].name;
                                    //resolve(fd_table);
                                }
                                if(fields[field].name == value+"_tid"){
                                     fd_table = "node__"+data1["field_name"]+"."+fields[field].name;
                                   // resolve(fd_table);
                                }
                                if(fields[field].name == value+"_status"){
                                    fd_table = "node__"+data1["field_name"]+"."+fields[field].name;
                                  // resolve(fd_table);
                               }
                
                                if(fields[field].name == value+"_target_id"){
                                    fd_table = "node__"+data1["field_name"]+"."+fields[field].name;
                                // resolve(fd_table);
                            }
                            }
                            
                            resolve(fd_table);

                }else{
                    reject(error);
                }
            })
        })
    },
    putfield : function (field) {
        var self =this;
        return when.promise(function(resolve, reject) {
            var dir = './query';
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            var content_types =[];
            var select ={};
            var countQuery ={};
            var countPage ={};
            var module ={};
            var ct=Object.keys(_.keyBy(field,"content_types"));
            ct.map(function (data, index) {
                var allkey=_.filter(field, { 'content_types': data });
                var schema = [];
                var last=[];
                var queries =[];
                allkey.map(function (data1, index) {
                    last.push("node__"+data1["field_name"])
                     queries.push(
                         self.getQuery(data1)
                     )
                    });
                when.all(queries).then(function(result){
                    var where = [];
                    for(var key in last){
                        where.push("LEFT JOIN "+last[key]+" ON "+last[key]+".entity_id = node.nid ")
                        // where.join(" ")
                    }
                    where.push("LEFT JOIN users ON users.uid = node.uid")
                    var left ="";
                    for(i= where.length-1; i>=0;i--){
                        left=where[i]+left;
                    }
                    last.unshift("node")
                    result.unshift("SELECT node.nid,node.title,node.langcode,node.created")
                    var resultdetail = result.join(",")

                    var type = "'"+data+"'";
                    var querydata = resultdetail.concat(" FROM  node_field_data node "+left+" WHERE node.type = "+type)
                    countPage = ("SELECT count(node.nid) as countentry FROM  node_field_data node "+left+" WHERE node.type = "+type)
                    // console.log(" countpage -------------------------- ",countPage)
                    select[data] = querydata.toString();
                    countQuery[data+"Count"] = countPage.toString();
                    var main = {
                        page: select,
                        count: countQuery
                    }
                    // var obj = Object.assign({}, select,countQuery);
                    helper.writeFile(path.join(dir, "index.json"), JSON.stringify(main, null, 4))
                })
                .catch(function(){
                    reject()
                })
            })
        })
    },
    start : function () {
        var self = this;
        var details_data = [];
        return when.promise(function(resolve, reject){
            self.connection.connect()
            var query=config["mysql-query"]["ct_mapped"];
            self.connection.query(query, function(error, rows, fields) {

                
                for(var i=0; i<rows.length; i++) {
                    var conv_details = phpUnserialize(rows[i].data)
                     details_data.push({field_name:conv_details.field_name, content_types:conv_details.bundle, type:conv_details.field_type})
                 }
                if(!error){
                    if(details_data.length>0){
                        self.putfield(details_data)
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
    }
}
module.exports = Extractfield;