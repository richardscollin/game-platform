const { registerLink } = require("jsdoc/util/templateHelper");
const links = require("./links.json");

exports.handlers = {
  parseBegin() {
    for (const key in links) {
      registerLink(key, links[key]);
    }
  },
};
