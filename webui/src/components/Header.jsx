import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import VisibilityIcon from '@material-ui/icons/Visibility';
import VisibilityOffIcon from '@material-ui/icons/VisibilityOff';
import SettingsEthernetIcon from '@material-ui/icons/SettingsEthernet';
import Tooltip from '@material-ui/core/Tooltip';
import { Link } from 'react-router-dom';

import GitHubIcon from '@material-ui/icons/GitHub';
import QuestionAnswerIcon from '@material-ui/icons/QuestionAnswer';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import { useShowHidden, useSetHiddenVisibility, useIsConnected, useSetTroubleshootingVisible } from 'utils/useSoundSyncState';
import logo from 'res/logo_only.svg';
import { PeersListDialog } from 'components/PeersList';
import { CircularProgress, Button } from '@material-ui/core';

const useStyles = makeStyles((t) => ({
  root: {
    flexGrow: 1,
    backgroundImage: 'linear-gradient(141deg,#1f191a 0,#363636 71%,#46403f 100%)',
  },
  menuButton: {
    color: 'white',
    '&:hover': {
      color: 'white',
    },
  },
  spacer: {
    flexGrow: 1,
  },
  betaIndicator: {
    fontSize: '0.6em',
    transform: 'translateY(-10px)',
    display: 'inline-block',
    [t.breakpoints.down('sm')]: {
      transform: 'none',
    },
  },
  toolbar: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
  },
  iconButtonsContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  titleContainer: {
    '& > a': {
      display: 'flex',
      justifyContent: 'flex-start',
      alignItems: 'center',
    },
  },
  title: {
    color: 'white',
    [t.breakpoints.down('sm')]: {
      fontSize: '1rem',
      lineHeight: 1,
    },
  },
  loadingIndicator: {
    width: '20px !important',
    height: '20px !important',
    marginRight: 10,
    color: 'white',
    [t.breakpoints.down('sm')]: {
      width: '15px !important',
      height: '15px !important',
      marginBottom: 5,
    },
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    [t.breakpoints.down('sm')]: {
      flexDirection: 'column',
    },
  },
  loadingText: {
    [t.breakpoints.down('sm')]: {
      fontSize: '0.8rem',
    },
  },
  connectedContainer: {
    [t.breakpoints.down('sm')]: {
      width: 40,
    },
  },
  connectedButton: {
    [t.breakpoints.down('sm')]: {
      fontSize: '0.8rem',
    },
  },
}));

export const Header = React.memo(() => {
  const classes = useStyles();
  const showHidden = useShowHidden();
  const setHidden = useSetHiddenVisibility();
  const setTroubleshootingVisible = useSetTroubleshootingVisible();
  const [peersListOpen, setPeersListOpen] = useState(false);

  return (
    <AppBar position="static" className={classes.root}>
      <Toolbar className={classes.toolbar}>
        <div className={classes.titleContainer}>
          <Link to="/landing">
            <img src={logo} className="soundsync-logo" height="30" width="30" />

            <Typography variant="h6" className={classes.title}>
              Soundsync
              {' '}
              <span className={classes.betaIndicator}>BETA</span>
            </Typography>
          </Link>
        </div>
        <div />
        <div className={classes.iconButtonsContainer}>
          <Tooltip title="Troubleshooting" aria-label="Troubleshooting">
            <IconButton
              color="inherit"
              className={classes.menuButton}
              onClick={() => setTroubleshootingVisible(true)}
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Join the discussion on Discord" aria-label="Join the discussion on Discord">
            <IconButton
              color="inherit"
              className={classes.menuButton}
              href="https://discord.gg/j2BZ5KC"
            >
              <QuestionAnswerIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Get more information about Soundsync on Github" aria-label="Get more information about Soundsync on Github">
            <IconButton
              color="inherit"
              className={classes.menuButton}
              href="https://github.com/geekuillaume/soundsync"
            >
              <GitHubIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Show peers" aria-label="Show peers">
            <IconButton
              color="inherit"
              className={classes.menuButton}
              onClick={() => setPeersListOpen(true)}
            >
              <SettingsEthernetIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Show/Hide hidden" aria-label="Show/Hide hidden">
            <IconButton
              edge="end"
              className={classes.menuButton}
              color="inherit"
              onClick={() => setHidden(!showHidden)}
            >
              {showHidden ? <VisibilityIcon /> : <VisibilityOffIcon />}
            </IconButton>
          </Tooltip>
        </div>
      </Toolbar>

      <PeersListDialog open={peersListOpen} onClose={() => setPeersListOpen(false)} />
    </AppBar>
  );
});
