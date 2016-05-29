import React from 'react';
import { render } from 'react-dom'
import { Router, Route, IndexRoute, Link, createMemoryHistory } from 'react-router'
import Application from './application.jsx';
import ServerBrowser from './pages/server-browser/index.jsx';
import JamSession from './pages/jam-session/index.jsx';

const history = createMemoryHistory(location);

// Render top-level component to page
render(
  <Router history={history}>
    <Route path="/" component={Application}>
      <IndexRoute component={ServerBrowser} />
      <Route path="jam" component={JamSession}/>
      <Route path="*" component={ServerBrowser}/>
    </Route>
  </Router>,
  document.getElementById('container')
);
