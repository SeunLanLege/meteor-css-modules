/* eslint-env node, mocha */
import './test-helpers/global-variables.stub';
import chai from 'chai';
import CssModulesProcessor from './css-modules-processor';
import { reloadOptions } from './options';
import { generatePreprocessedFileObject } from './test-helpers/generate-file-object';

const expect = chai.expect;

describe('CssModulesProcessor', function() {
  describe('#process()', function() {
    describe('file.contents', function() {
      it('should transpile the passed in file', async function z() {
        const file = {
          importPath: './test.css',
          contents: '.test { color: red; } .test2 { color: blue; }',
          referencedImportPaths: [],
          getPathInPackage() {
            return './test.css';
          }
        };

        const processor = new CssModulesProcessor({ ...reloadOptions() });
        await processor.process(file);

        expect(file.contents).to.equal('._test__test { color: red; } ._test__test2 { color: blue; }\n/*# sourceMappingURL=test.css.map */');
      });

      it('should not transpile passthrough files', async function z() {
        const file = {
          importPath: './test.css',
          contents: '.test { color: red; } .test2 { color: blue; }',
          referencedImportPaths: [],
          getPathInPackage() {
            return './test.css';
          }
        };
        const pluginOptions = { ...reloadOptions() };
        pluginOptions.passthroughPaths.push(/test/);

        const processor = new CssModulesProcessor(pluginOptions);
        await processor.process(file);

        expect(file.contents).to.equal('.test { color: red; } .test2 { color: blue; }');
      });
    });

    describe('file.tokens', function() {
      it('should export the class names as an object', async function z() {
        const file = {
          importPath: './test.css',
          contents: '.test { color: red; } .test-two { color: blue; }',
          referencedImportPaths: [],
          getPathInPackage() {
            return './test.css';
          }
        };
        const pluginOptions = { ...reloadOptions() };
        const processor = new CssModulesProcessor(pluginOptions);
        await processor.process(file);

        expect(file.tokens).to.eql({
          'test': '_test__test',
          'test-two': '_test__test-two'
        });
      });

      it('should camelcase the JS class names when the camelcase option is enabled', async function z() {
        const file = {
          importPath: './test.css',
          contents: '.test { color: red; } .test-two { color: blue; }',
          referencedImportPaths: [],
          getPathInPackage() {
            return './test.css';
          }
        };
        const pluginOptions = { ...reloadOptions() };
        pluginOptions.jsClassNamingConvention.camelCase = true;
        const processor = new CssModulesProcessor(pluginOptions);
        await processor.process(file);

        expect(file.tokens).to.eql({
          'test': '_test__test',
          'testTwo': '_test__test-two'
        });
      });

      it('should pull in tokens from imported files', async function z() {
        const allFiles = new Map();
        addFile(generatePreprocessedFileObject('./direct-import1.css', '.test { color: red; }'));
        addFile(generatePreprocessedFileObject('./direct-import2.css', '.test { composes: test from "./indirect-import.css"; }'));
        addFile(generatePreprocessedFileObject('./indirect-import.css', '.test { color: red; }'));
        const file = generatePreprocessedFileObject('./test.css', '.test { composes: test from "./direct-import1.css"; } .test-two { composes: test from "./direct-import2.css"; }');
        const pluginOptions = { ...reloadOptions() };
        const processor = new CssModulesProcessor(pluginOptions);
        await processor.process(file, allFiles);

        expect(file.tokens).to.eql({
          'test': '_test__test _direct_import1__test',
          'test-two': '_test__test-two _direct_import2__test _indirect_import__test'
        });

        function addFile(file) {
          allFiles.set(file.importPath, file);
        }
      });
    });

    describe('file.referencedImportPaths', function() {
      it('should list all of the files that the current file imports', async function z() {
        const allFiles = new Map();
        addFile(generatePreprocessedFileObject('./direct-import1.css', '.test { color: red; }'));
        addFile(generatePreprocessedFileObject('./direct-import2.css', '.test { composes: test from "./indirect-import.css"; }'));
        addFile(generatePreprocessedFileObject('./indirect-import.css', '.test { color: red; }'));
        const file = generatePreprocessedFileObject('./test.css', '.test { composes: test from "./direct-import1.css"; } .test-two { composes: test from "./direct-import2.css"; }');
        const pluginOptions = { ...reloadOptions() };
        const processor = new CssModulesProcessor(pluginOptions);
        await processor.process(file, allFiles);

        expect(file.referencedImportPaths).to.eql([
          'D:/projects/meteor-css-modules/direct-import1.css',
          'D:/projects/meteor-css-modules/direct-import2.css',
          'D:/projects/meteor-css-modules/indirect-import.css'
        ]);

        function addFile(file) {
          allFiles.set(file.importPath, file);
        }
      });

      it('should build a deduplicated list of all the files that the current file imports directly or indirectly', async function z() {
        const allFiles = new Map();
        addFile(generatePreprocessedFileObject('./direct-import1.css', '.test { color: red; }'));
        addFile(generatePreprocessedFileObject('./direct-import2.css', '.test { composes: test from "./indirect-import.css"; }'));
        addFile(generatePreprocessedFileObject('./indirect-import.css', '.test { composes: test from "./direct-import1.css"; }'));
        const file = generatePreprocessedFileObject('./test.css', '.test { composes: test from "./direct-import1.css"; } .test-two { composes: test from "./direct-import2.css"; }');
        const pluginOptions = { ...reloadOptions() };
        const processor = new CssModulesProcessor(pluginOptions);
        await processor.process(file, allFiles);

        expect(file.referencedImportPaths).to.eql([
          'D:/projects/meteor-css-modules/direct-import1.css',
          'D:/projects/meteor-css-modules/direct-import2.css',
          'D:/projects/meteor-css-modules/indirect-import.css'
        ]);

        function addFile(file) {
          allFiles.set(file.importPath, file);
        }
      });
    });

    describe('file.imports', function() {
      it('should list the files that the current file imports directly', async function z() {
        const allFiles = new Map();
        addFile(generatePreprocessedFileObject('./direct-import1.css', '.test { color: red; }'));
        addFile(generatePreprocessedFileObject('./direct-import2.css', '.test { composes: test from "./indirect-import.css"; }'));
        addFile(generatePreprocessedFileObject('./indirect-import.css', '.test { color: red; }'));
        const file = generatePreprocessedFileObject('./test.css', '.test { composes: test from "./direct-import1.css"; } .test-two { composes: test from "./direct-import2.css"; }');
        const pluginOptions = { ...reloadOptions() };
        const processor = new CssModulesProcessor(pluginOptions);
        await processor.process(file, allFiles);

        expect(file.imports).to.eql([
          './direct-import1.css',
          './direct-import2.css'
        ]);

        function addFile(file) {
          allFiles.set(file.importPath, file);
        }
      });
    });

    describe('file.sourcemap', function() {
      it('should generate a sourcemap', async function z() {
        const file = {
          importPath: './test.css',
          contents: '.test { color: red; } .test2 { color: blue; }',
          referencedImportPaths: [],
          getPathInPackage() {
            return './test.css';
          }
        };

        const processor = new CssModulesProcessor({ ...reloadOptions() });
        await processor.process(file);

        expect(file.sourceMap).to.eql({
          'file': 'test.css',
          'mappings': 'AAAA,eAAQ,WAAW,EAAE,CAAC,gBAAS,YAAY,EAAE',
          'names': [],
          'sources': [
            'test.css'
          ],
          'sourcesContent': [
            '.test { color: red; } .test2 { color: blue; }'
          ],
          'version': 3
        });
      });
    });
  });
});
