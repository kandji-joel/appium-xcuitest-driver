import sinon from 'sinon';
import XCUITestDriver from '../../../lib/driver';
import {gesturesChainToString} from '../../../lib/commands/gesture';
import _ from 'lodash';
import sinonChai from 'sinon-chai';
import chai from 'chai';

chai.use(sinonChai);

describe('gesture commands', function () {
  const driver = new XCUITestDriver();
  const proxySpy = sinon.stub(driver, 'proxyCommand');

  afterEach(function () {
    proxySpy.reset();
  });

  describe('gesturesChainToString', function () {
    it('should properly transform simple chain', function () {
      gesturesChainToString([{action: 'press'}, {action: 'release'}]).should.equal('press-release');
    });

    it('should properly transform complex chain with default keys', function () {
      gesturesChainToString([
        {action: 'press', x: 1, options: {count: 1}},
        {action: 'release'},
      ]).should.equal('press(options={"count":1})-release');
    });

    it('should properly transform complex chain with custom keys', function () {
      gesturesChainToString(
        [{action: 'press', x: 1, options: {count: 1}}, {action: 'release'}],
        ['x']
      ).should.equal('press(x=1)-release');
    });

    it('should properly transform complex chain with all keys', function () {
      gesturesChainToString([{action: 'press', x: 1}, {action: 'release'}], null).should.equal(
        'press(x=1)-release'
      );
    });
  });

  describe('tap', function () {
    it('should send POST request to /tap on WDA when no element is given', async function () {
      const actions = [{action: 'tap'}];
      await driver.performTouch(actions);
      proxySpy.calledOnce.should.be.true;
      proxySpy.firstCall.args[0].should.eql('/wda/touch/perform');
      proxySpy.firstCall.args[1].should.eql('POST');
    });
    it('should send POST request to /tap/element on WDA', async function () {
      const actions = [{action: 'tap', options: {element: 42}}];
      await driver.performTouch(actions);
      proxySpy.calledOnce.should.be.true;
      proxySpy.firstCall.args[0].should.eql('/wda/touch/perform');
      proxySpy.firstCall.args[1].should.eql('POST');
    });
    it('should send POST request to /tap/element with offset on WDA', async function () {
      const actions = [{action: 'tap', options: {element: 42, x: 1, y: 2}}];
      await driver.performTouch(actions);
      proxySpy.should.have.been.calledOnceWith('/wda/touch/perform', 'POST', {actions});
    });
  });

  describe('mobile methods', function () {
    describe('anything other than scroll', function () {
      it('should throw an error', async function () {
        await driver.execute('mobile: somesuch').should.be.rejected;
      });
    });

    describe('scroll', function () {
      it('should throw an error if no scroll type is specified', async function () {
        await driver
          .execute('mobile: scroll', {element: 4})
          .should.be.rejectedWith(/Mobile scroll supports the following strategies/);
      });
      it('should pass through bare element', async function () {
        await driver.execute('mobile: scroll', {element: 4, direction: 'down'});
        proxySpy.calledOnce.should.be.true;
        proxySpy.firstCall.args[0].should.eql('/wda/element/4/scroll');
        proxySpy.firstCall.args[1].should.eql('POST');
      });
      it('should unpack element object', async function () {
        await driver.execute('mobile: scroll', {element: {ELEMENT: 4}, direction: 'down'});
        proxySpy.calledOnce.should.be.true;
        proxySpy.firstCall.args[0].should.eql('/wda/element/4/scroll');
        proxySpy.firstCall.args[1].should.eql('POST');
      });
      it('should pass name strategy exclusively', async function () {
        await driver.execute('mobile: scroll', {element: 4, direction: 'down', name: 'something'});
        proxySpy.should.have.been.calledOnceWith('/wda/element/4/scroll', 'POST', {
          name: 'something',
        });
      });
      it('should pass direction strategy exclusively', async function () {
        await driver.execute('mobile: scroll', {
          element: 4,
          direction: 'down',
          predicateString: 'something',
        });
        proxySpy.should.have.been.calledOnceWith('/wda/element/4/scroll', 'POST', {
          direction: 'down',
        });
      });
      it('should pass predicateString strategy exclusively', async function () {
        await driver.execute('mobile: scroll', {
          element: 4,
          toVisible: true,
          predicateString: 'something',
        });
        proxySpy.should.have.been.calledOnceWith('/wda/element/4/scroll', 'POST', {
          predicateString: 'something',
        });
      });
    });

    describe('swipe', function () {
      const commandName = 'swipe';

      it('should throw an error if no direction is specified', async function () {
        await driver.execute(`mobile: ${commandName}`, {element: 4}).should.be.rejected;
      });

      it('should throw an error if invalid direction', async function () {
        await driver.execute(`mobile: ${commandName}`, {element: 4, direction: 'foo'}).should.be
          .rejected;
      });

      it('should proxy a swipe up request through to WDA', async function () {
        await driver.execute(`mobile: ${commandName}`, {element: 4, direction: 'up'});
        proxySpy.should.have.been.calledOnceWith('/wda/element/4/swipe', 'POST', {direction: 'up'});
      });
    });

    describe('pinch', function () {
      const commandName = 'pinch';

      it('should throw an error if no mandatory parameter is specified', async function () {
        await driver
          .execute(`mobile: ${commandName}`, {element: 4, scale: 4.1})
          .should.be.rejectedWith(/parameters were incorrect/i);
        await driver
          .execute(`mobile: ${commandName}`, {element: 4, velocity: -0.5})
          .should.be.rejectedWith(/parameters were incorrect/i);
      });

      it('should throw an error if param is invalid', async function () {
        await driver
          .execute(`mobile: ${commandName}`, {element: 4, scale: '', velocity: 1})
          .should.be.rejectedWith(/should be a valid number/);
        await driver
          .execute(`mobile: ${commandName}`, {element: 4, scale: 0, velocity: null})
          .should.be.rejectedWith(/should be a valid number/);
      });

      it('should proxy a pinch request through to WDA', async function () {
        const opts = {element: 4, scale: 1, velocity: '1'};
        await driver.execute(`mobile: ${commandName}`, opts);
        proxySpy.should.have.been.calledOnceWith('/wda/element/4/pinch', 'POST', {
          scale: opts.scale,
          velocity: parseInt(opts.velocity, 10),
        });
      });
    });

    describe('doubleTap', function () {
      const commandName = 'doubleTap';

      it('should throw an error if no mandatory parameter is specified', async function () {
        await driver
          .execute(`mobile: ${commandName}`, {x: 100})
          .should.be.rejectedWith(/"y" parameter should be a valid number/);
        await driver
          .execute(`mobile: ${commandName}`, {y: 200})
          .should.be.rejectedWith(/"x" parameter should be a valid number/);
      });

      it('should throw an error if param is invalid', async function () {
        await driver
          .execute(`mobile: ${commandName}`, {x: '', y: 1})
          .should.be.rejectedWith(/should be a valid number/);
        await driver
          .execute(`mobile: ${commandName}`, {x: 1, y: null})
          .should.be.rejectedWith(/should be a valid number/);
      });

      it('should proxy a doubleTap request for an element through to WDA', async function () {
        await driver.execute(`mobile: ${commandName}`, {element: 4});
        proxySpy.calledOnce.should.be.true;
        proxySpy.firstCall.args[0].should.eql('/wda/element/4/doubleTap');
        proxySpy.firstCall.args[1].should.eql('POST');
      });

      it('should proxy a doubleTap request for a coordinate point through to WDA', async function () {
        const opts = {x: 100, y: 100};
        await driver.execute(`mobile: ${commandName}`, opts);
        proxySpy.should.have.been.calledOnceWith('/wda/doubleTap', 'POST', opts);
      });
    });

    describe('twoFingerTap', function () {
      const commandName = 'twoFingerTap';

      it('should proxy a twoFingerTap request for an element through to WDA', async function () {
        await driver.execute(`mobile: ${commandName}`, {element: 4});
        proxySpy.calledOnce.should.be.true;
        proxySpy.firstCall.args[0].should.eql('/wda/element/4/twoFingerTap');
        proxySpy.firstCall.args[1].should.eql('POST');
      });
    });

    describe('touchAndHold', function () {
      const commandName = 'touchAndHold';

      it('should throw an error if no mandatory parameter is specified', async function () {
        await driver
          .execute(`mobile: ${commandName}`, {duration: 100, x: 1})
          .should.be.rejectedWith(/"y" parameter should be a valid number/);
        await driver
          .execute(`mobile: ${commandName}`, {duration: 100, y: 200})
          .should.be.rejectedWith(/"x" parameter should be a valid number/i);
        await driver
          .execute(`mobile: ${commandName}`, {x: 100, y: 200})
          .should.be.rejectedWith(/parameters were incorrect/i);
      });

      it('should throw an error if param is invalid', async function () {
        await driver
          .execute(`mobile: ${commandName}`, {duration: '', x: 1, y: 1})
          .should.be.rejectedWith(/should be a valid number/);
        await driver
          .execute(`mobile: ${commandName}`, {duration: 1, x: '', y: 1})
          .should.be.rejectedWith(/should be a valid number/);
        await driver
          .execute(`mobile: ${commandName}`, {duration: 1, x: 1, y: null})
          .should.be.rejectedWith(/should be a valid number/);
      });

      it('should proxy a touchAndHold request for an element through to WDA', async function () {
        const opts = {element: 4, duration: 100};
        await driver.execute(`mobile: ${commandName}`, opts);
        proxySpy.should.have.been.calledOnceWith(
          '/wda/element/4/touchAndHold',
          'POST',
          _.omit(opts, 'elementId') // note elementId here, not element
        );
      });

      it('should proxy a touchAndHold request for a coordinate point through to WDA', async function () {
        const opts = {duration: 100, x: 100, y: 100};
        await driver.execute('mobile: touchAndHold', opts);
        proxySpy.should.have.been.calledOnceWith('/wda/touchAndHold', 'POST', opts);
      });
    });

    describe('tap', function () {
      const commandName = 'tap';

      it('should throw an error if no mandatory parameter is specified', async function () {
        await driver
          .execute(`mobile: ${commandName}`, {})
          .should.be.rejectedWith(/parameters were incorrect/i);
        await driver
          .execute(`mobile: ${commandName}`, {x: 100})
          .should.be.rejectedWith(/parameters were incorrect/i);
        await driver
          .execute(`mobile: ${commandName}`, {y: 200})
          .should.be.rejectedWith(/parameters were incorrect/i);
      });

      it('should throw an error if param is invalid', async function () {
        await driver
          .execute(`mobile: ${commandName}`, {x: '', y: 1})
          .should.be.rejectedWith(/should be a valid number/);
        await driver
          .execute(`mobile: ${commandName}`, {x: 1, y: null})
          .should.be.rejectedWith(/should be a valid number/);
      });

      it('should proxy a tap request for an element through to WDA', async function () {
        const opts = {elementId: 4, x: 100, y: 100};
        await driver.execute(`mobile: ${commandName}`, opts);
        proxySpy.should.have.been.calledOnceWith('/wda/tap/4', 'POST', _.omit(opts, 'elementId'));
      });

      it('should proxy a tap request for a coordinate point through to WDA', async function () {
        const opts = {x: 100, y: 100};
        await driver.execute(`mobile: ${commandName}`, opts);
        proxySpy.should.have.been.calledOnceWith('/wda/tap/0', 'POST', opts);
      });
    });

    describe('selectPickerWheelValue', function () {
      const commandName = 'selectPickerWheelValue';

      it('should throw an error if no mandatory parameter is specified', async function () {
        await driver
          .execute(`mobile: ${commandName}`, {})
          .should.be.rejectedWith(/parameters were incorrect/i);
        await driver
          .execute(`mobile: ${commandName}`, {element: 4})
          .should.be.rejectedWith(/parameters were incorrect/i);
        await driver
          .execute(`mobile: ${commandName}`, {order: 'next'})
          .should.be.rejectedWith(/parameters were incorrect/i);
      });

      it('should throw an error if offset value cannot be parsed', async function () {
        await driver
          .execute(`mobile: ${commandName}`, {element: 4, order: 'next', offset: 'bla'})
          .should.be.rejectedWith(/should be a valid number/);
      });

      it('should throw an error if param is invalid', async function () {
        await driver
          .execute(`mobile: ${commandName}`, {element: 4, order: 'bla'})
          .should.be.rejectedWith(/is expected to be equal/);
      });

      it('should proxy a selectPickerWheel request for an element through to WDA', async function () {
        const opts = {elementId: 4, order: 'next', offset: 0.3};
        await driver.execute(`mobile: ${commandName}`, opts);
        proxySpy.should.have.been.calledOnceWith(
          '/wda/pickerwheel/4/select',
          'POST',
          _.omit(opts, 'elementId')
        );
      });
    });

    describe('dragFromToForDuration', function () {
      const commandName = 'dragFromToForDuration';

      it('should throw an error if no mandatory parameter is specified', async function () {
        await driver
          .execute(`mobile: ${commandName}`, {fromX: 1, fromY: 1, toX: 100, toY: 100})
          .should.be.rejectedWith(/parameters were incorrect/i);
        await driver
          .execute(`mobile: ${commandName}`, {duration: 100, fromY: 1, toX: 100, toY: 100})
          .should.be.rejectedWith(/parameters were incorrect/i);
        await driver
          .execute(`mobile: ${commandName}`, {duration: 100, fromX: 1, toX: 100, toY: 100})
          .should.be.rejectedWith(/parameters were incorrect/i);
        await driver
          .execute(`mobile: ${commandName}`, {duration: 100, fromX: 1, fromY: 1, toY: 100})
          .should.be.rejectedWith(/parameters were incorrect/i);
        await driver
          .execute(`mobile: ${commandName}`, {duration: 100, fromX: 1, fromY: 1, toX: 100})
          .should.be.rejectedWith(/parameters were incorrect/i);
      });

      it('should throw an error if param is invalid', async function () {
        await driver
          .execute(`mobile: ${commandName}`, {duration: '', fromX: 1, fromY: 1, toX: 100, toY: 100})
          .should.be.rejectedWith(/should be a valid number/);
        await driver
          .execute(`mobile: ${commandName}`, {
            duration: 100,
            fromX: '',
            fromY: 1,
            toX: 100,
            toY: 100,
          })
          .should.be.rejectedWith(/should be a valid number/);
        await driver
          .execute(`mobile: ${commandName}`, {
            duration: 100,
            fromX: 1,
            fromY: null,
            toX: 100,
            toY: 100,
          })
          .should.be.rejectedWith(/should be a valid number/);
        await driver
          .execute(`mobile: ${commandName}`, {
            duration: 100,
            fromX: 1,
            fromY: 1,
            toX: 'blabla',
            toY: 100,
          })
          .should.be.rejectedWith(/should be a valid number/);
        await driver
          .execute(`mobile: ${commandName}`, {
            duration: 100,
            fromX: 1,
            fromY: 1,
            toX: 100,
            toY: NaN,
          })
          .should.be.rejectedWith(/should be a valid number/);
      });

      it('should proxy a dragFromToForDuration request for an element through to WDA', async function () {
        const opts = {element: 4, duration: 100, fromX: 1, fromY: 1, toX: 100, toY: 100};
        await driver.execute(`mobile: ${commandName}`, {
          element: 4,
          duration: 100,
          fromX: 1,
          fromY: 1,
          toX: 100,
          toY: 100,
        });
        proxySpy.should.have.been.calledOnceWith(
          '/wda/element/4/dragfromtoforduration',
          'POST',
          _.omit(opts, 'element')
        );
      });

      it('should proxy a dragFromToForDuration request for a coordinate point through to WDA', async function () {
        const opts = {duration: 100, fromX: 1, fromY: 1, toX: 100, toY: 100};
        await driver.execute(`mobile: ${commandName}`, opts);
        proxySpy.should.have.been.calledOnceWith('/wda/dragfromtoforduration', 'POST', opts);
      });
    });

    describe('getCoordinates', function () {
      it('should properly parse coordinates if they are presented as string values', async function () {
        const gesture = {
          action: 'moveTo',
          options: {
            x: '100',
            y: '300',
          },
        };
        const coords = await driver.getCoordinates(gesture);
        coords.areOffsets.should.be.true;
        coords.x.should.be.within(100, 101);
        coords.y.should.be.within(300, 301);
      });
      it('should properly parse coordinates if they are presented as numeric values', async function () {
        const gesture = {
          action: 'press',
          options: {
            x: 100.5,
            y: 300,
          },
        };
        const coords = await driver.getCoordinates(gesture);
        coords.areOffsets.should.be.false;
        coords.x.should.be.within(100, 101);
        coords.y.should.be.within(300, 301);
      });
      it('should throw an exception if coordinates cannot be parsed', async function () {
        const gesture = {
          action: 'moveTo',
          options: {
            x: 'a',
            y: 300,
          },
        };
        try {
          await driver.getCoordinates(gesture);
          sinon.assert.fail('An exception is expected to be thrown');
        } catch (e) {
          // this is expected
        }
      });
    });
  });
});

describe('W3C actions', function () {
  const driver = new XCUITestDriver();
  it('releaseActions should exist and do nothing', async function () {
    await driver.releaseActions();
  });
});
