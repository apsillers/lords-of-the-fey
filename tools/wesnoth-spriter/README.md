To install the spriter as a Chrome extension:

1. go to `chrome://extensions`
2. turn on "Developer mode"
3. click "Load unpacked"
4. select the `wesnoth-spriter` directory
5. copy the ID string (it's a jumble of letters)
6. go to `chrome-extension://aaaaaaaaaaaaaaaaaaaa/spriter.html`, where `aaaaaaaaaaaaaaaaaaaaa` is the ID you just copied

To use the spriter, you choose a unit (specified by `{race}/{name}`) and a set of actions separated by commas.

Output includes:

* the sprite on a canvas (which you can "Save as")
* a JSON string representing the ranges of each action requested