module.exports = function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w]+/g, '-');
};
