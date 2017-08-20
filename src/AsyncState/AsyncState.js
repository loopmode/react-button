import React, { Component, PropTypes } from 'react';

const groups = {
    default: []
};

const logger = window.console;
// import logger from '@xailabs/logger';
// @logger('AsyncState')
export default class AsyncState extends Component {
    static propTypes = {
        successDuration: PropTypes.number,
        errorDuration: PropTypes.number,
        successClass: PropTypes.string,
        errorClass: PropTypes.string,
        children: PropTypes.element,
        pendingProp: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
        pendingGroupProp: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
        group: PropTypes.oneOfType([PropTypes.string, PropTypes.func, PropTypes.bool])
    };
    static defaultProps = {
        successClass: 'success',
        successDuration: 1000,
        errorClass: 'danger',
        errorDuration: 1000,
        pendingProp: ['showSpinner', 'disabled'],
        pendingGroupProp: ['disabled'],
    };
    get child() {
        return React.Children.only(this.props.children);
    }
    state = {
        isPending: false,
        isPendingGroup: false,
        hintSuccess: false,
        hintError: false,
    };
    componentDidMount() {
        this._isMounted = true;
        if (this.props.group) {
            this.registerGroup(this.props.group);
        }
    }
    componentWillReceiveProps(nextProps) {
        if (nextProps.group !== this.props.group) {
            this.unregisterGroup(this.props.group);
            this.registerGroup(nextProps.group);
        }
    }
    componentWillUnmount() {
        this._isMounted = false;
        this.clearTimeouts();
        if (this.props.group) {
            this.unregisterGroup(this.props.group);
        }
    }
    setStateSafely(nextState) {
        this._isMounted && this.setState(nextState);
    }
    render() {
        return React.cloneElement(this.child, this.createChildProps(this.child));
    }
    createChildProps() {
        const {onClick, ...childProps} = this.child.props;
        if (onClick) {
            childProps.onClick = this.handleClick;
        }
        const applyPendingProp = (props, value) => {
            if (typeof value === 'string') {
                props[value] = true;
            }
            else {
                value.forEach(prop => props[prop] = true);
            }
        };
        if (this.state.isPending) {
            applyPendingProp(childProps, this.props.pendingProp);
        }
        if (this.state.isPendingGroup) {
            applyPendingProp(childProps, this.props.pendingGroupProp);
        }
        return childProps;
    }
    handleClick = (e) => {
        this.logger.log('handleClick');
        const promise = this.child.props.onClick(e);
        if (promise && typeof promise.then === 'function') {
            this.clearTimeouts();
            this.setState({isPending: true});
            if (this.props.group) {
                this.setGroupPending(this.props.group, true);
            }
            // setup success mechanism
            promise.then(() => {
                this.logger.info('success!');
                this.setStateSafely({isPending: false, hintSuccess: true, hintError: false});
                this.setGroupPending(this.props.group, false);
                this._successTimeout = window.setTimeout(() => this.setStateSafely({hintSuccess: false}), this.props.successDuration);
            });
            // setup error mechanism
            promise.catch(() => {
                this.logger.info('success!');
                this.setStateSafely({isPending: false, hintError: true, hintSuccess: false});
                this.setGroupPending(this.props.group, false);
                this._errorTimeout = window.setTimeout(() => this.setStateSafely({hintError: false}), this.props.errorDuration);
            });
        }
    }
    clearTimeouts = () => {
        window.clearTimeout(this._successTimeout);
        window.clearTimeout(this._errorTimeout);
    }
    getGroupName(group) {
        switch (typeof group) {
            case 'boolean': return 'default';
            case 'string': return group;
            case 'function': return this.getGroupName(group(this));
        }
    }
    registerGroup(group) {
        if (group) {
            const groupName = this.getGroupName(group);
            groups[groupName] = [...(groups[groupName] || []), this];
        }
    }
    unregisterGroup(group) {
        if (group) {
            const groupName = this.getGroupName(group);
            groups[groupName] = (groups[groupName] || []).filter(component => component !== this);
        }
    }
    setGroupPending(group, isPendingGroup) {
        const groupName = this.getGroupName(group);
        const groupMembers = groups[groupName];
        this.logger.info('setGroupPending', {groupName, groupMembers});
        if (groupMembers) {
            groupMembers
                .filter(component => component !== this)
                .forEach(component => {
                    this.logger.info('setGroupPending', {component, isPendingGroup});
                    component.setStateSafely({isPendingGroup});
                })
            ;
        }
    }
}
