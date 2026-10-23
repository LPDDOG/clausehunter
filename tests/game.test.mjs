import test from 'node:test';
import assert from 'node:assert/strict';
import { starCount } from '../src/components/game.js';

test('关卡星标边界与成绩一致，未完成时不显示已获星标',()=>{
  for(const [score,expected] of [[0,0],[1,1],[59,1],[60,2],[89,2],[90,3],[100,3]]) {
    assert.equal(starCount(score,true),expected);
    assert.equal(starCount(score,false),0);
  }
});
