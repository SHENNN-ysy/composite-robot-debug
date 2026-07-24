package com.robot.debug.application.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.robot.debug.application.model.LuaProgramEntity;
import com.robot.debug.application.model.ProgramEntity;
import com.robot.debug.application.repository.LuaProgramMapper;
import com.robot.debug.application.repository.ProgramMapper;
import com.robot.debug.application.service.AuditService;
import com.robot.debug.application.service.ProgramService;
import com.robot.debug.interfaces.rest.DTO.ProgramDtos;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 可视化流程与 Lua 独立持久化测试。
 */
@ExtendWith(MockitoExtension.class)
class ProgramServiceImplTest {
    @Mock private ProgramMapper programMapper;
    @Mock private LuaProgramMapper luaProgramMapper;
    @Mock private AuditService auditService;
    private ProgramService service;

    /** 创建包含两个独立 Mapper 的程序服务。 */
    @BeforeEach
    void setUp() {
        service = new ProgramServiceImpl(programMapper, luaProgramMapper, new ObjectMapper(), auditService);
    }

    /** 新建程序时流程和 Lua 正文必须分别写入 program 与 lua_program。 */
    @Test
    void createPersistsFlowAndLuaInSeparateTables() {
        AtomicReference<ProgramEntity> savedProgram = new AtomicReference<>();
        AtomicReference<LuaProgramEntity> savedLua = new AtomicReference<>();
        doAnswer(invocation -> {
            ProgramEntity entity = invocation.getArgument(0);
            entity.setId(10L);
            savedProgram.set(entity);
            return 1;
        }).when(programMapper).insert(any(ProgramEntity.class));
        doAnswer(invocation -> {
            LuaProgramEntity entity = invocation.getArgument(0);
            entity.setId(20L);
            savedLua.set(entity);
            return 1;
        }).when(luaProgramMapper).insert(any(LuaProgramEntity.class));
        when(programMapper.selectById(10L)).thenAnswer(invocation -> savedProgram.get());
        when(luaProgramMapper.selectOne(any())).thenAnswer(invocation -> savedLua.get());

        ProgramDtos.View view = service.create(
                new ProgramDtos.SaveRequest("demo.lua", new ObjectMapper().createObjectNode(), "print('ok')", "tester"),
                "tester");

        assertThat(savedProgram.get().getFlowJson()).isEqualTo("{}");
        assertThat(savedLua.get().getProgramId()).isEqualTo(10L);
        assertThat(savedLua.get().getLuaContent()).isEqualTo("print('ok')");
        assertThat(view.luaContent()).isEqualTo("print('ok')");
        verify(programMapper).insert(any(ProgramEntity.class));
        verify(luaProgramMapper).insert(any(LuaProgramEntity.class));
    }
}
