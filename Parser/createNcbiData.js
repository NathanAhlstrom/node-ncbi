var parseString = require('xml2js').parseString;
var _ = require('underscore');

/**
Class DataObject.
This class is intatiated with either a JavaScript object, an XML string,
or a JSON string. The Object created from that data is assigned to
this.data. If an object cannot be created from the initialization parameter,
this.data is equal to null.
The class also contains several helper methods for working with the data in
this.data
@arg: data: object or string | JS object, XML, or JSON for storing the data
*/
function NcbiData(data) {
  var dataObj;
  //if simple javascript object
  if ( _.isObject(data) ) {
    record = data;
  } else {
    //try JSON
    try {
      record = JSON.parse(data);
    } catch(err) {
      //try XML
      parseString(data, function(err, result) {
        if (err) {
          record = null;
        } else {
          record = result;
        }
        this.record = record;
      });
    }
  }
  this.record = record;
}

/**
 * Perform a deep search on an object. Return an array of nodes identified by
 * the find argument.
 * NOTE: this function can call itself, and must be identified by a named
 * function expression.
 * @arg: find | string | the node key to search for
 * @arg: data | the object to search through.
 * @return: an array of nodes.
 */
NcbiData.prototype.deepSearch = function deepSearch(find, data) {
  data = data || this.record;
  var found = [];
  //if data is not an object, return an empty array.
  if ( ! _.isObject(data) ) {
    return found;
  }
  //go through each property, and assign it to found if the key
  //matches the key we're looking for
  _.each(data, function(value, key) {
    if (key === find) {
      found.push(value);
    }
    //now add in the nodes from the sub-object. If the value of the
    //property is not an object, deepSearch will just return an empty array.
    found = found.concat(deepSearch(find, value));
  });
  return found;
}

/**
 * Get the value for a particuler string. xml2js creates objects in a couple
 * of different ways, sometimes storing the value of a node as a propertry indexed
 * by the underscore character, and sometimes wrapping that in an array.
 * This function gets at the property contained within one or both of those
 * wrappers.
 * NOTE: this function can call itself, and must be identified by a named
 * function expression.
 * @arg: string, object, or array | representing a node usually created by xml2js
 * @return: string (at the top level) otherwise string, object or array
 */
NcbiData.prototype.nodeValue = function nodeValue(node) {
  if ( _.isString(node) ) {
    return node;
  } else if ( _.isArray(node) ) {
    return nodeValue(node[0]);
  } else if ( _.isObject(node) ) {
    return nodeValue(node._);
  } else {
    return null;
  }
}

/**
 * Find the values of all nodes within an array.
 * @arg: nodes | array of nodes
 * @return: array of strings representing the values of those nodes
 */
NcbiData.prototype.nodeValues = function(nodes) {
  var valueArr = [];
  _.each(nodes, function(node) {
    valueArr.push( this.nodeValue(node) );
  }.bind(this));
  return valueArr;
}

/**
 * A wrapper around the parsing logic.
 * @arg: logic: String or Function | if string, will call this.deepSearch and
 * find nodes with that name.
 * If function, will execute the function.
 * @arg: single: Boolean. Whether to expect a single result or an array.
 * @return: Null, String, or Array.
 * If no results are found, return null.
 * If the logic results in an Exception, returns null.
 * If single is true, returns a string.
 * Otherwise, returns an Array.
 */
NcbiData.prototype.find = function(logic, single) {
  var found = [];
  if ( _.isString(logic) ) {
    found = this.deepSearch(logic);
  } else if ( _.isFunction(logic) ) {
    try {
      found = logic.call(this, this.record);
    } catch(e) {
      return null;
    }
  }
  if (!found.length) {
    return null;
  }
  if (single) {
    return this.nodeValue(found[0]);
  } else {
    return this.nodeValues(found);
  }
}

module.exports = function(data) {
  return new NcbiData(data);
}