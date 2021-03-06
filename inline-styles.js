/**
 * inlineStyles
 * Transplants styles from style/link tags to style attributes.
 *
 * @example
 * inlineStyles(window.document)
 *
 * `document` argument needs to be in a window for styles to be computed properly.
 * Uses values from computed values instead of CSSRule values, to take advantage
 * of browsers' css specificity/cascade implementation.
 *
 * By default, style/link tags are inlined, then removed from the document.
 * These options can be opted out of with a `data-inline-options` attribute.
 * `preserve`d tags will be inlined, but not removed from the document.
 * `ignore`d tags will be disabled during inlining. See unit test for more detail.
 *
 */
// UMD's amdWeb pattern
(function (root, factory) {
  if (typeof define === 'function' && define.amd){
    // AMD. Register as an anonymous module.
    define([], factory);
  } else {
    // Browser globals
    root.inlineStyles = factory();
  }
}(this, function(){

  // create an array from arrayish lists
  function arrayFrom(nodelist){
    return [].slice.call(nodelist);
  }

  // parses the value of `inline-options` attribute
  function parseOptions(el){
    var s = el.getAttribute('data-inline-options') || '';
    return { ignore: /ignore/.test(s), preserve: /preserve/.test(s) };
  }

  // remove element from the dom
  function removeElement(el){
    return el.parentNode.removeChild(el);
  }

  // ensures elements matching a rule
  // have their associated properties set inline.
  function inlineRule(el, rule){
    var computed = window.getComputedStyle(el);
    for(var i = 0; i < rule.style.length; i++){
      var prop = rule.style.item(i);
      var computedVal = computed.getPropertyValue(prop);
      // if element's style attribute doesn't have this property,
      // then set it to the computed value
      if(!el.style.getPropertyValue(prop)){
        el.style.setProperty(prop, computedVal);
      }
    }
  }

  // Loops through a stylesheet's rules,
  // selects each rule's targeted elements, and
  // ensures matching properties have been inlined.
  function inlineStyle(elStyle){
    //console.log('elStyle', elStyle)
    var doc = elStyle.ownerDocument;
    var rules = elStyle.sheet.cssRules;
    if(!rules){
      console.error('stylesheet rules cannot be read from ', elStyle.href);
      return;
    }

    arrayFrom(rules)
      // only STYLE_RULEs, and no pseudo selectors or starting stars
      // see: https://developer.mozilla.org/en-US/docs/Web/API/CSSRule#Type_constants
      .filter(function(r){
        return r.type == 1 &&
          // no pseudo selectors
          !(/:/.test(r.selectorText)) &&
          // no starting stars (universal selector)
          !(/^\*/.test(r.selectorText));
      })
      .forEach(function(rule){
        arrayFrom(doc.querySelectorAll(rule.selectorText))
          .forEach(function(el){
            inlineRule(el, rule);
          })
    })
  }

  // takes a rendered document and inlines its stylesheets.
  return function inlineStyles(doc){

    var tags = arrayFrom(doc.querySelectorAll('style, link[rel="stylesheet"]')),
        tags2inline = [],
        tags2remove = [],
        tags2ignore = [];

    tags.forEach(function processTag(el){
      var opts = parseOptions(el);
      // ignore and inline tags are mutually exclusive
      (opts.ignore ? tags2ignore : tags2inline).push(el);
      if(!opts.preserve) tags2remove.push(el);
    });

    // disable ignored tags so they're not a part of the computedStyles
    tags2ignore.forEach(function(el){el._prevDisabled = el.disabled;  el.disabled = true; });

    // WORKAROUND:
    // Computed styles will calculate non-pixel unit values (e.g. % percentages) into pixel values.
    // Hidden elements retain their non-pixel unit values.
    // see: http://stackoverflow.com/questions/8387419/retrieving-percentage-css-values-in-firefox
    // As a workaround, temporarily hide the entire body.
    var bodyDisplay = doc.body.style.display;
    doc.body.style.display = 'none';

    // inline link/style rules
    tags2inline.forEach(inlineStyle);

    // restore original display property
    doc.body.style.display = bodyDisplay;

    // re-enable ignored tags, restoring their original disabled state
    tags2ignore.forEach(function(el){ el.disabled = el._prevDisabled;});

    // cleanup
    tags2remove.forEach(removeElement);

    // move any remaining tags in the head to the body
    arrayFrom(doc.head.querySelectorAll('style, link[rel="stylesheet"]'))
      .reverse()
      .forEach(function(el){
        el.removeAttribute('data-inline-options')
        doc.body.insertBefore(el, doc.body.firstChild);
      })

    return doc;
  };

}));
