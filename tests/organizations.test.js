import test from 'node:test';
import assert from 'node:assert/strict';
import {validOrganizationName,validOrganizationSlug} from '../server/organizations.js';
test('organization validation rejects unsafe names and slugs',()=>{
 assert.equal(validOrganizationName('OpenShield Africa'),true);
 assert.equal(validOrganizationName(' '),false);
 assert.equal(validOrganizationName('x'.repeat(121)),false);
 assert.equal(validOrganizationSlug('openshield-africa'),true);
 assert.equal(validOrganizationSlug('../admin'),false);
 assert.equal(validOrganizationSlug('CAPITALS'),false);
});
