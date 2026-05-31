import * as assert from 'assert';
import * as sinon from 'sinon';
import {
    SpeedreadingEngine,
    SpeedreadingConfig,
    WordSegments,
    SpeedreadingState,
    CodeBlockUpdate
} from '../speedreading_engine';

function makeConfig(overrides: Partial<SpeedreadingConfig> = {}): SpeedreadingConfig {
    return {
        wpm: 250,
        highlightColor: '#007acc',
        fontSize: 24,
        pauseOnPunctuation: false,
        orpHighlightColor: '#ff4444',
        ...overrides
    };
}

describe('SpeedreadingEngine', () => {
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        clock.restore();
    });

    describe('loadText', () => {
        it('filters whitespace and empty tokens', () => {
            const engine = new SpeedreadingEngine(makeConfig());
            engine.loadText('  hello   world  ');
            assert.strictEqual(engine.getState().totalWords, 2);
            engine.stop();
        });

        it('counts a single word correctly', () => {
            const engine = new SpeedreadingEngine(makeConfig());
            engine.loadText('hello');
            assert.strictEqual(engine.getState().totalWords, 1);
            engine.stop();
        });
    });

    describe('getState', () => {
        it('reports zero progress and zero totalWords for empty text', () => {
            const engine = new SpeedreadingEngine(makeConfig());
            engine.loadText('');
            const state = engine.getState();
            assert.strictEqual(state.totalWords, 0);
            assert.strictEqual(state.progress, 0);
            engine.stop();
        });

        it('computes progress correctly after seekTo(50)', () => {
            const engine = new SpeedreadingEngine(makeConfig());
            // 4 words -> seekTo(50) -> targetIndex = floor(0.5 * 4) = 2
            engine.loadText('one two three four');
            engine.seekTo(50);
            const state = engine.getState();
            assert.strictEqual(state.currentIndex, 2);
            assert.strictEqual(state.totalWords, 4);
            assert.strictEqual(state.progress, (2 / 4) * 100);
            engine.stop();
        });
    });

    describe('seekTo', () => {
        it('clamps to valid index range', () => {
            const engine = new SpeedreadingEngine(makeConfig());
            engine.loadText('one two three four five'); // len 5

            engine.seekTo(0);
            assert.strictEqual(engine.getState().currentIndex, 0);

            engine.seekTo(100);
            // floor(1.0 * 5) = 5 -> clamped to len-1 = 4
            assert.strictEqual(engine.getState().currentIndex, 4);

            engine.seekTo(-50);
            // floor(-0.5 * 5) = -3 -> clamped to 0
            assert.strictEqual(engine.getState().currentIndex, 0);

            engine.stop();
        });
    });

    describe('setWPM', () => {
        it('clamps below 50 up to 50', () => {
            const engine = new SpeedreadingEngine(makeConfig());
            engine.setWPM(10);
            assert.strictEqual(engine.getConfig().wpm, 50);
        });

        it('clamps above 1000 down to 1000', () => {
            const engine = new SpeedreadingEngine(makeConfig());
            engine.setWPM(5000);
            assert.strictEqual(engine.getConfig().wpm, 1000);
        });

        it('keeps an in-range value', () => {
            const engine = new SpeedreadingEngine(makeConfig());
            engine.setWPM(400);
            assert.strictEqual(engine.getConfig().wpm, 400);
        });
    });

    describe('ORP segmentation via word update callback', () => {
        it('segments a multi-char word correctly', () => {
            const engine = new SpeedreadingEngine(makeConfig());
            let last: WordSegments | undefined;
            engine.setOnWordUpdate((segments: WordSegments, _state: SpeedreadingState) => {
                last = segments;
            });
            engine.loadText('hello');
            engine.play(); // immediate emit fires synchronously inside startInterval

            assert.ok(last, 'expected a word update to fire');
            assert.strictEqual(last!.before, 'h');
            assert.strictEqual(last!.orp, 'e');
            assert.strictEqual(last!.after, 'llo');

            engine.pause();
            engine.stop();
        });

        it('handles a single-char word safely', () => {
            const engine = new SpeedreadingEngine(makeConfig());
            let last: WordSegments | undefined;
            engine.setOnWordUpdate((segments: WordSegments) => {
                last = segments;
            });
            engine.loadText('a');
            engine.play();

            assert.ok(last, 'expected a word update to fire');
            assert.strictEqual(last!.before, '');
            assert.strictEqual(last!.orp, 'a');
            assert.strictEqual(last!.after, '');

            engine.pause();
            engine.stop();
        });
    });

    describe('inline code', () => {
        it('flags inline code and captures inner content', () => {
            const engine = new SpeedreadingEngine(makeConfig());
            let last: WordSegments | undefined;
            engine.setOnWordUpdate((segments: WordSegments) => {
                last = segments;
            });
            engine.loadText('«code:short»x«/code»');
            engine.play();

            assert.ok(last, 'expected a word update to fire');
            assert.strictEqual(last!.isInlineCode, true);
            assert.strictEqual(last!.inlineCodeContent, 'x');

            engine.pause();
            engine.stop();
        });
    });

    describe('code block token', () => {
        it('skips the [CODE BLOCK N] tokens and fires an active code block update', () => {
            const engine = new SpeedreadingEngine(makeConfig({ wpm: 600 }));
            const codeUpdates: CodeBlockUpdate[] = [];
            const wordSegmentsSeen: WordSegments[] = [];

            engine.setOnCodeBlockUpdate((update: CodeBlockUpdate) => {
                codeUpdates.push(update);
            });
            engine.setOnWordUpdate((segments: WordSegments) => {
                wordSegmentsSeen.push(segments);
            });

            engine.loadText('one [CODE BLOCK 0] two', ['```js\ncode\n```']);
            engine.play();

            // Drive playback well past the end. base interval = 60000/600 = 100ms.
            // Word-length scaling only changes the multiplier, so generous ticking
            // guarantees all advances happen regardless of exact ms.
            clock.tick(2000);

            const activeUpdate = codeUpdates.find(u => u.isActive === true && u.codeIndex === 0);
            assert.ok(activeUpdate, 'expected an active code block update for index 0');

            // No word update should have been emitted for the code block tokens.
            const reassemble = (s: WordSegments) => s.before + s.orp + s.after;
            const reassembled = wordSegmentsSeen.map(reassemble);
            assert.ok(!reassembled.includes('[CODE'), 'should not emit [CODE token as a word');
            assert.ok(!reassembled.includes('BLOCK'), 'should not emit BLOCK token as a word');
            assert.ok(!reassembled.includes('0]'), 'should not emit 0] token as a word');

            engine.stop();
        });
    });

    describe('pauseOnPunctuation', () => {
        it('pauses after a punctuated word and resumes after 300ms', () => {
            const engine = new SpeedreadingEngine(makeConfig({ pauseOnPunctuation: true, wpm: 250 }));
            engine.loadText('cat. dog'); // words: ['cat.', 'dog']
            engine.play();

            // First interval tick: shows 'cat.', advances to index 1, then pauses
            // because the previous word ('cat.') ends in punctuation.
            // base interval = 60000/250 = 240ms; 'cat.' len 4 -> base interval.
            // Tick exactly one interval so we observe the pause before the
            // scheduled 300ms resume timer fires (avoid overshooting to the end).
            clock.tick(240);
            assert.strictEqual(engine.getState().isPlaying, false, 'engine should pause after punctuation');

            // The scheduled setTimeout(300) should resume playback. After the
            // pause at t=240ms, the resume fires at t=540ms; the next 'dog'
            // interval is later still, so ticking 300ms lands on the resume.
            clock.tick(300);
            assert.strictEqual(engine.getState().isPlaying, true, 'engine should resume after 300ms');

            engine.pause();
            engine.stop();
        });

        it('does not pause when pauseOnPunctuation is false', () => {
            const engine = new SpeedreadingEngine(makeConfig({ pauseOnPunctuation: false, wpm: 250 }));
            engine.loadText('cat. dog');
            engine.play();

            // After one tick the engine should still be playing (no punctuation pause).
            clock.tick(240);
            assert.strictEqual(engine.getState().isPlaying, true, 'engine should keep playing without punctuation pause');

            engine.pause();
            engine.stop();
        });
    });

    describe('play / pause / stop transitions', () => {
        it('transitions isPlaying and resets index on stop', () => {
            const engine = new SpeedreadingEngine(makeConfig());
            engine.loadText('one two three four');
            engine.seekTo(50); // move index off zero
            assert.strictEqual(engine.getState().currentIndex, 2);

            engine.play();
            assert.strictEqual(engine.getState().isPlaying, true);

            engine.pause();
            assert.strictEqual(engine.getState().isPlaying, false);

            engine.stop();
            assert.strictEqual(engine.getState().isPlaying, false);
            assert.strictEqual(engine.getState().currentIndex, 0);
        });
    });

    describe('looping', () => {
        it('restarts from index 0 after reaching the end', () => {
            const engine = new SpeedreadingEngine(makeConfig({ wpm: 600 }));
            engine.loadText('one two');
            engine.play();

            // Drive playback far past the end so the engine stops and resets index.
            clock.tick(5000);
            const afterEnd = engine.getState();
            assert.strictEqual(afterEnd.isPlaying, false, 'engine should stop at the end');
            assert.strictEqual(afterEnd.currentIndex, 0, 'index should reset after end');

            // Playing again should start from the beginning.
            engine.play();
            const restarted = engine.getState();
            assert.strictEqual(restarted.currentIndex, 0);
            assert.strictEqual(restarted.isPlaying, true);

            engine.pause();
            engine.stop();
        });
    });
});
