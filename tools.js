export function parseIni(str, dontEscape) {
  let regex = {
    section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
    param: /^\s*([^=]+?)\s*=\s*(.*?)\s*$/,
    comment: /^\s*;.*$/,
  };
  let value = {};
  let lines = str.split(/[\r\n]+/);
  let section = null;

  lines.forEach(function (line) {
    if (regex.comment.test(line)) {
      return;
    } else if (regex.param.test(line)) {
      let match = line.match(regex.param);
      let paramValue = match[2];
      
      if (!dontEscape) {
        paramValue = paramValue.replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\')
          .replace(/\\b/g, '\b')
          .replace(/\\f/g, '\f');
      }

      if (section) {
        value[section][match[1]] = paramValue;
      } else {
        value[match[1]] = paramValue;
      }
    } else if (regex.section.test(line)) {
      let match = line.match(regex.section);
      value[match[1]] = {};
      section = match[1];
    } else if (line.length == 0 && section) {
      section = null;
    }
  });


  return value;
}
