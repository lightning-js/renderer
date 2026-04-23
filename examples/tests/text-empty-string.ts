import type { ExampleSettings } from '../common/ExampleSettings.js';

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const text = renderer.createTextNode({
    text: 'Hello',
    fontFamily: 'Ubuntu',
    fontSize: 100,
    parent: testRoot,
  });

  // doesn't clear the text node
  setTimeout(() => {
    //check with multiple newlines no words
    text.text = '\n\n';
  }, 1000);

  setTimeout(() => {
    text.text = 'Hello again';
  }, 2000);

  setTimeout(() => {
    //check with a single space character
    text.text = ' ';
  }, 3000);

  setTimeout(() => {
    text.text = 'Hello again two';
  }, 4000);

  setTimeout(() => {
    text.text = '\u200B'; // zero-width space
  }, 5000);
}
