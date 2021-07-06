const fabric = require('@umijs/fabric');
module.exports = {
  ...fabric.stylelint,
  rules: {
    'property-no-unknown': null,
    'no-descending-specificity': null,
  },
};
