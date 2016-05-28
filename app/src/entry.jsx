import React from 'react';
import { render } from 'react-dom'
import { Router, Route, IndexRoute, Link, hashHistory } from 'react-router'
import Application from './application.jsx';
import ServerBrowser from './pages/server-browser/index.jsx';
import JamSession from './pages/jam-session/index.jsx';

// Render top-level component to page
render(
  <Router history={hashHistory}>
    <Route path="/" component={Application}>
      <IndexRoute component={ServerBrowser} />
      <Route path="*" component={ServerBrowser}/>
      <Route path="jam" component={JamSession}/>
    </Route>
  </Router>,
  document.getElementById('container')
);
