// scroll_animations.js
// GSAP ScrollTrigger animations for each section.
// Handles nav entrance, text reveals, and scroll-based fade effects.

const listItems = document.querySelectorAll('#nav ul li');
const border = document.querySelector('#nav_border');

const DURATION = 1;
const STAGGER = 0.07;

// SplitText instances for character/word animations
let heroSplit       = SplitText.create("#hero_title", { type: "chars" });
let presenterSplit  = SplitText.create("#hero_presenters", { type: "chars" });
let backgroundSplit = SplitText.create("#background_text", { type: "words" });
let discoverySplit  = SplitText.create("#discovery_text", { type: "words" });
let posMomSplit     = SplitText.create("#pos_mom_text", { type: "words" });
let enerTimeSplit   = SplitText.create("#ener_time_text", { type: "words" });
let azimAngSplit    = SplitText.create("#azim_ang_text", { type: "words" });

// Helper: fade a section as it scrolls out
function addSectionFade(sectionSelector) {
  gsap.to(sectionSelector, {
    opacity: 0,
    scrollTrigger: {
      trigger: sectionSelector,
      start: 'bottom 90%',
      end: 'bottom 0%',
      scrub: 0.5,
    }
  });
}

// Everything starts after the page transition
window.addEventListener('pageRevealed', () => {

  // --- Hero + Nav ---
  const tl = gsap.timeline({ delay: 1.2 });

  tl.from(listItems, {
    opacity: 0,
    color: "red",
    y: -30,
    duration: DURATION,
    stagger: STAGGER,
    ease: "back.out(1)",
  })
  .to(border, {
    scaleX: 1,
    color: "orange",
    duration: DURATION - 0.65,
    ease: "linear",
  }, "<")
  .from(heroSplit.chars, {
    duration: 1,
    color: "blue",
    y: 100,
    autoAlpha: 0,
    stagger: 0.01,
    ease: "power2.out"
  }, "<")
  .from(presenterSplit.chars, {
    duration: 0.8,
    color: "yellow",
    y: -100,
    autoAlpha: 0,
    stagger: 0.005,
    ease: "power2.out"
  }, "<");

  // --- Background Section ---
  addSectionFade('#background_section');

  const bg = gsap.timeline({
    scrollTrigger: {
      trigger: '#background_section',
      start: 'top 80%',
      end: 'top 60%',
      toggleActions: 'play none reverse none',
    }
  });

  bg.from('#heisen_image_box', {
    x: -100,
    opacity: 0,
    duration: 0.6,
    ease: 'back.out'
  })
  .from('#heisen_name', {
    x: 50,
    opacity: 0,
    color: "red",
    duration: 0.5,
    ease: 'back.out'
  }, '<')
  .from('#background_title', {
    x: 100,
    borderBottomWidth: 0,
    opacity: 0,
    duration: 1,
    ease: 'back.out'
  }, '>')
  .from(backgroundSplit.words, {
    x: 100,
    autoAlpha: 0,
    duration: 0.6,
    stagger: 0.01,
    ease: 'back.out'
  }, '<');

  // --- Discovery Section ---
  addSectionFade('#discovery_section');

  const dc = gsap.timeline({
    scrollTrigger: {
      trigger: '#discovery_section',
      start: 'top 80%',
      end: 'top 60%',
      toggleActions: 'play none reverse none',
    }
  });

  dc.from('#discovery_sim', {
    x: 100,
    opacity: 0,
    duration: 0.6,
    ease: 'back.out'
  })
  .from('#discovery_title .strip', {
    x: -100,
    opacity: 0,
    duration: 0.5,
    ease: 'back.out'
  }, '<')
  .from(discoverySplit.words, {
    x: 100,
    autoAlpha: 0,
    duration: 0.6,
    stagger: 0.01,
    ease: 'back.out'
  }, '<');

  // --- Position-Momentum Section ---
  addSectionFade('#pos_mom_section');

  const pos = gsap.timeline({
    scrollTrigger: {
      trigger: '#pos_mom_section',
      start: 'top 80%',
      end: 'top 60%',
      toggleActions: 'play none reverse none',
    }
  });

  pos.from('#pos_mom_header .strip', {
    x: -100,
    opacity: 0,
    duration: 0.5,
    ease: 'back.out'
  })
  .from(posMomSplit.words, {
    y: -100,
    autoAlpha: 0,
    duration: 0.6,
    stagger: 0.01,
    ease: 'back.out'
  }, '<')
  .from('#first_plot', {
    opacity: 0,
    y: 50,
    duration: 0.5,
    ease: 'power2.out'
  }, '>')
  .from('#pos_mom_controls', {
    opacity: 0,
    y: 30,
    duration: 0.5,
    ease: 'power2.out'
  }, '>');

  // --- Energy-Time Section ---
  addSectionFade('#ener_time_section');

  const et = gsap.timeline({
    scrollTrigger: {
      trigger: '#ener_time_section',
      start: 'top 80%',
      end: 'top 60%',
      toggleActions: 'play none reverse none',
    }
  });

  et.from('#ener_time_header .strip', {
    x: -100,
    opacity: 0,
    duration: 0.5,
    ease: 'back.out'
  })
  .from(enerTimeSplit.words, {
    y: 100,
    autoAlpha: 0,
    duration: 0.6,
    stagger: 0.01,
    ease: 'back.out'
  }, '<')
  .from('#second_plot', {
    opacity: 0,
    y: 50,
    duration: 0.5,
    ease: 'power2.out'
  }, '>')
  .from('#third_plot', {
    opacity: 0,
    y: 50,
    duration: 0.5,
    ease: 'power2.out'
  }, '>')
  .from('#ener_time_controls', {
    opacity: 0,
    y: 30,
    duration: 0.5,
    ease: 'power2.out'
  }, '>');

  // --- Azimuthal-Angular Section ---
  addSectionFade('#azim_ang_section');

  const az = gsap.timeline({
    scrollTrigger: {
      trigger: '#azim_ang_section',
      start: 'top 80%',
      end: 'top 60%',
      toggleActions: 'play none reverse none',
    }
  });

  az.from('#azim_ang_header .strip', {
    x: -100,
    opacity: 0,
    duration: 0.5,
    ease: 'back.out'
  })
  .from(azimAngSplit.words, {
    x: -100,
    autoAlpha: 0,
    duration: 0.6,
    stagger: 0.01,
    ease: 'back.out'
  }, '<')
  .from('#third_sim', {
    x: -100,
    opacity: 0,
    duration: 0.6,
    ease: 'back.out'
  }, '>')
  .from('#azim_control_box', {
    x: 100,
    opacity: 0,
    duration: 0.5,
    ease: 'back.out'
  }, '<');

});
