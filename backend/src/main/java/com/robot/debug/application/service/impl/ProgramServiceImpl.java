package com.robot.debug.application.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.robot.debug.application.service.AuditService;
import com.robot.debug.application.service.ProgramService;
import com.robot.debug.common.BizException;
import com.robot.debug.application.model.LuaProgramEntity;
import com.robot.debug.application.model.ProgramEntity;
import com.robot.debug.application.repository.LuaProgramMapper;
import com.robot.debug.application.repository.ProgramMapper;
import com.robot.debug.interfaces.rest.DTO.ProgramDtos;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 可视化流程与 Lua 程序服务实现。
 */
@Service
@Slf4j
public class ProgramServiceImpl implements ProgramService {
    private final ProgramMapper mapper;
    private final LuaProgramMapper luaProgramMapper;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;

    public ProgramServiceImpl(ProgramMapper mapper, LuaProgramMapper luaProgramMapper,
                              ObjectMapper objectMapper, AuditService auditService) {
        this.mapper = mapper;
        this.luaProgramMapper = luaProgramMapper;
        this.objectMapper = objectMapper;
        this.auditService = auditService;
    }

    /** 查询程序列表；Lua 内容按需求原样返回前端。 */
    @Override
    public List<ProgramDtos.View> list() {
        List<ProgramDtos.View> programs = mapper.selectList(
                        Wrappers.<ProgramEntity>lambdaQuery().orderByDesc(ProgramEntity::getUpdatedAt))
                .stream().map(entity -> toView(entity, getLuaEntity(entity.getId()))).toList();
        log.info("程序列表查询完成 count={}", programs.size());
        return programs;
    }

    /** 按主键查询程序视图。 */
    @Override
    public ProgramDtos.View get(Long id) {
        ProgramEntity entity = getEntity(id);
        return toView(entity, getLuaEntity(id));
    }

    /** 按主键查询内部流程实体。 */
    @Override
    public ProgramEntity getEntity(Long id) {
        ProgramEntity entity = mapper.selectById(id);
        if (entity == null) {
            log.warn("程序查询失败 programId={} reason=NOT_FOUND", id);
            throw BizException.notFound("程序不存在");
        }
        return entity;
    }

    /** 从独立 Lua 程序表读取原始文本。 */
    @Override
    public String getLuaContent(Long id) {
        getEntity(id);
        return getLuaEntity(id).getLuaContent();
    }

    /** 原样保存前端流程 JSON 与 Lua 文本。 */
    @Override
    @Transactional
    public ProgramDtos.View create(ProgramDtos.SaveRequest request, String operator) {
        log.info("创建程序开始 operator={} name={} luaLength={}",
                operator, request.name(), request.luaContent().length());
        ProgramEntity entity = new ProgramEntity();
        copy(request, entity);
        entity.setVersion(1);
        entity.setCreatedBy(request.createdBy() == null ? operator : request.createdBy());
        mapper.insert(entity);

        LuaProgramEntity luaProgram = new LuaProgramEntity();
        luaProgram.setProgramId(entity.getId());
        luaProgram.setLuaContent(request.luaContent());
        luaProgramMapper.insert(luaProgram);

        auditService.record(operator, "CREATE", "PROGRAM", String.valueOf(entity.getId()),
                Map.of("name", entity.getName()), "SUCCESS");
        log.info("创建程序成功 programId={} name={} version={}",
                entity.getId(), entity.getName(), entity.getVersion());
        return get(entity.getId());
    }

    /** 更新程序并将版本号递增。 */
    @Override
    @Transactional
    public ProgramDtos.View update(Long id, ProgramDtos.SaveRequest request, String operator) {
        log.info("更新程序开始 operator={} programId={} name={} luaLength={}",
                operator, id, request.name(), request.luaContent().length());
        ProgramEntity entity = getEntity(id);
        copy(request, entity);
        entity.setVersion(entity.getVersion() + 1);
        mapper.updateById(entity);

        LuaProgramEntity luaProgram = getLuaEntity(id);
        luaProgram.setLuaContent(request.luaContent());
        luaProgramMapper.updateById(luaProgram);

        auditService.record(operator, "UPDATE", "PROGRAM", String.valueOf(id),
                Map.of("name", entity.getName(), "version", entity.getVersion()), "SUCCESS");
        log.info("更新程序成功 programId={} name={} version={}", id, entity.getName(), entity.getVersion());
        return get(id);
    }

    /** 删除流程；数据库外键级联删除对应 Lua 程序，并写入审计记录。 */
    @Override
    @Transactional
    public void delete(Long id, String operator) {
        log.info("删除程序开始 operator={} programId={}", operator, id);
        ProgramEntity entity = getEntity(id);
        mapper.deleteById(id);
        auditService.record(operator, "DELETE", "PROGRAM", String.valueOf(id),
                Map.of("name", entity.getName()), "SUCCESS");
        log.info("删除程序成功 programId={} name={}", id, entity.getName());
    }

    /** 将保存请求中的流程元数据复制到流程实体。 */
    private void copy(ProgramDtos.SaveRequest request, ProgramEntity entity) {
        entity.setName(request.name());
        entity.setFlowJson(request.flow().toString());
    }

    /** 将流程实体与 Lua 正文组合为 REST 接口视图。 */
    private ProgramDtos.View toView(ProgramEntity entity, LuaProgramEntity luaProgram) {
        return new ProgramDtos.View(entity.getId(), entity.getName(), readTree(entity.getFlowJson()),
                luaProgram.getLuaContent(), entity.getVersion(), entity.getCreatedBy(),
                entity.getCreatedAt(), entity.getUpdatedAt());
    }

    /** 按流程主键查询一对一关联的 Lua 程序记录。 */
    private LuaProgramEntity getLuaEntity(Long programId) {
        LuaProgramEntity entity = luaProgramMapper.selectOne(
                Wrappers.<LuaProgramEntity>lambdaQuery().eq(LuaProgramEntity::getProgramId, programId));
        if (entity == null) {
            log.warn("Lua程序查询失败 programId={} reason=NOT_FOUND", programId);
            throw BizException.notFound("Lua程序不存在");
        }
        return entity;
    }

    /** 解析历史流程 JSON；脏数据存在时返回空对象，避免列表接口整体失败。 */
    private JsonNode readTree(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException exception) {
            log.warn("程序流程JSON解析失败，已返回空对象 jsonLength={}",
                    json == null ? 0 : json.length(), exception);
            return objectMapper.createObjectNode();
        }
    }
}
