import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PlayerArt } from '../src/renderer/src/art/PlayerArt'
console.log(renderToStaticMarkup(<PlayerArt jersey={23} />))
