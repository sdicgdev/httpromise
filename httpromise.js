var https = require('q-io/http'),
    querystring = require('querystring'),
    processByMimeType = require("./lib/mimeProcessor"),
		extend = require('underscore').extend,
		httpAgent = require('https');

/**
 * module: ApiResource
 * exports: boilerplate for dealing with resources
 * usage: 
 *
 *	var resource = require('./apiResource');
 *	new resource({
 *		host: 'api.clever.com',
 *		apiPath: '/v1.1/',
 *		ssl: true,
 *		auth: "Username:Pass",
 *	});
 *
 *	var obj = resource.get('object') //=> returns promise for
 *	                                 //   GET https://api.clever.com/v1.1/object
 *	obj.then(function(data){
 *		console.log(data) //=> object literal of JSON response
 *	}).fail(function(err){
 *		// information about failure
 *	}); 
 *
 */

function resource(options){
	var key;
	options.headers = (options.headers||{});
	this.requestBase = {
		host: options.host,
		ssl: options.ssl,
		path: (options.path||'/'),
		port: (options.port||80),
		headers: {}
	};

	if(options.options){
		extend(this.requestBase, options.options);
	}

	this.requestBase.agent = new httpAgent.Agent(this.requestBase);

	if(options.headers.request||options.headers.response){
		this.requestBase.headers.request  = (options.headers.request ||{})	
		this.requestBase.headers.response = (options.headers.response||{})	
	}else{
		this.requestBase.headers.request  = options.headers;
		this.requestBase.headers.response = options.headers;
	}
	if(options.auth){
		this.requestBase.headers.request.Authorization = this.authorize(options.auth);
	}
}

resource.prototype.authorize = function(auth){
	if(typeof auth == "string"){
		key = auth;
		if(!key.match(":")){
			key = key+":";
		}
	}else{
		key = auth.key+':'+(auth.pwd||'');
	}
	return 'Basic ' + new Buffer(key).toString('base64') 
}


resource.prototype.makeRequest = function(verb,path,data) {
	var headers, request = extend({}, this.requestBase);
	request.headers = request.headers.request;
	request.path    = request.path+path;
	request.method  = verb;

	data = (data||{});
	data.headers = (data.headers||{});
	if(data.headers.request || data.headers.response){
		extend(request.headers, (data.headers.request||{})); 
	}else{
		extend(request.headers, data.headers); 
	}
	if(data.query){
		for(key in data.query){
			if(typeof data.query[key]!='string' && typeof data.query[key]!='number'){
				data.query[key] = JSON.stringify(data.query[key]);
			}
		}
		request.path = request.path+"?"+querystring.stringify(data.query);
	}
	if(data.body){
		request.body = [processByMimeType.request(request, data.body)];
	}

	return https.request(request)
		.then(function(response){
			return processByMimeType.response(response);
		})
		.fail(function(err){
			console.log(err.stack);
		});
}

resource.prototype.post = function(path,data){
	return this.makeRequest("POST",path,data);
}
resource.prototype.get = function(path,data){
	return this.makeRequest("GET",path,data);
}
resource.prototype.put = function(path,data){
	return this.makeRequest("PUT",path,data);
}
resource.prototype.delete = function(path,data){
	return this.makeRequest("DELETE",path,data);
}
module.exports = function(){
	return resource
}
