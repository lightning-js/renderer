import type { ExampleSettings } from '../common/ExampleSettings.js';

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const text = renderer.createTextNode({
    text: 'Hello',
    fontFamily: 'Ubuntu',
    fontSize: 100,
    parent: testRoot,
  });

  //set the text with empty string
  setTimeout(() => {
    text.text = '';
  }, 1000);

  //set the text again after a short delay
  setTimeout(() => {
    text.text = 'Hello again';
  }, 2000);

  //set text with a single space character
  setTimeout(() => {
    text.text = ' ';
  }, 3000);

  //set the text again after a short delay
  setTimeout(() => {
    text.text = 'Hello again two';
  }, 4000);

  //set text with a zero-width space character
  setTimeout(() => {
    text.text = '\u200B'; // zero-width space
  }, 5000);
}
